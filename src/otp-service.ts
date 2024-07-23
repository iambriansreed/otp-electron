import jsSHA from 'jssha';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export default class OTPService {
    expiry: number;
    length: number;

    constructor(expiry = 30, length = 6) {
        this.expiry = expiry;
        this.length = length;
        // validate input
        if (this.length > 8 || this.length < 6) {
            throw 'Error: invalid code length';
        }
    }

    /**
     * @param {string} base32
     */
    base32toHex(base32: string) {
        let bits = '';
        let hex = '';
        let i = 0;
        while (i < base32.length) {
            const val = BASE32_CHARS.indexOf(base32.charAt(i).toUpperCase());
            bits += this.leftPad(val.toString(2), 5, '0');
            i++;
        }
        i = 0;
        while (i + 4 <= bits.length) {
            const chunk = bits.substr(i, 4);
            hex = hex + parseInt(chunk, 2).toString(16);
            i += 4;
        }
        return hex;
    }

    /**
     * @param {number} s
     */
    dec2hex(s: number) {
        return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
    }

    /**
     * @param {string} s
     */
    hexToDec(s: string) {
        return parseInt(s, 16);
    }

    /**
     * @param {string} str
     * @param {number} len
     * @param {string | undefined} pad
     */
    leftPad(str: string, len: number, pad: string) {
        if (len + 1 >= str.length) {
            str = Array(len + 1 - str.length).join(pad) + str;
        }
        return str;
    }

    /**
     * @param {number} now
     */
    calculateTimeCounter(now: number) {
        const epoch = Math.round(now / 1000.0);
        const time = this.leftPad(this.dec2hex(Math.floor(epoch / this.expiry)), 16, '0');
        return time;
    }

    /**
     * @param {string} hmac
     */
    mangleHmac(hmac: string) {
        const offset = this.hexToDec(hmac.substr(hmac.length - 1));
        const otp = (this.hexToDec(hmac.substr(offset * 2, 8)) & this.hexToDec('7fffffff')) + '';
        return otp.substr(otp.length - 6, 6);
    }

    /**
     * @param {string} secret
     */
    getTimeBasedOTP(secret: string, now = new Date().getTime()) {
        const key = this.base32toHex(secret);
        const time = this.calculateTimeCounter(now);
        const shaObj = new jsSHA('SHA-1', 'HEX');
        shaObj.setHMACKey(key, 'HEX');
        shaObj.update(time);
        const hmac = shaObj.getHMAC('HEX');
        const otp = this.mangleHmac(hmac);
        return otp;
    }
}

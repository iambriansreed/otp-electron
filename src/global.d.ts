declare interface Window {
    app: {
        generateOTP(secret: string): string;
        readUserData: () => Promise<string>;
        writeUserData: (data: string) => void;
        windowResize: (edit?: boolean) => void;
    };
}

interface String {
    /**
     * Gets a substring beginning at the specified location and having the specified length.
     * (deprecation removed)
     * @param from The starting position of the desired substring. The index of the first character in the string is zero.
     * @param length The number of characters to include in the returned substring.
     */
    substr(from: number, length?: number): string;
}

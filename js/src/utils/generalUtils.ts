
export function TextFromBlobAsync(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function() {
            resolve(reader.result);
        }
        reader.readAsText(blob);
    });
}

export function StringToASCII(text: string): number[] {
    return text.split('').map(c => c.charCodeAt(0));
}
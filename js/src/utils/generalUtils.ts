
export function TextFromBlobAsync(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function() {
            resolve(reader.result);
        }
        reader.readAsText(blob);
    });
}
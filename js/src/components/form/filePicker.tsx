import * as React from 'react';
import { TextFromBlobAsync } from '../../utils/generalUtils';

export interface FilePickerProps {
    onChange: (filename: string, text: string) => void;
    id?: string;
}

export class FilePicker extends React.PureComponent<FilePickerProps> {
    onChange = async (event: any) => {
        let files = event.target.files;
        if (files.length > 0) {
            let text = await TextFromBlobAsync(files[0]);

            this.props.onChange(files[0].name, text);
        }
    }

    render() {
        return (
            <div style={{ marginTop: '5px' }}>
                <input id={this.props.id ? this.props.id : 'file-picker'} type="file" onChange={this.onChange} />
            </div>
        );
    }
}
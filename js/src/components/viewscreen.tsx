import * as React from 'react';

export interface ViewscreenProps {
    width: number;
    height: number;
    layerCount: number;
}

export class Viewscreen extends React.Component<ViewscreenProps> {
    render() {
        let layers = [];
        for(let i = 0; i < this.props.layerCount; i ++) {
            layers.push(
                <canvas 
                    id={`canvas-${i}`} 
                    key={`canvas-${i}`}
                    width={this.props.width}
                    height={this.props.height}
                    style={{ zIndex: i }}
                    className={'drawing-canvas'}
                />
            );
        }

        return (
            <div>
                {layers}
            </div>
        );
    }
}
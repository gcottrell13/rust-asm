import * as React from 'react';
import * as d from '../utils/drawing';

export interface ViewscreenProps {
    width: number;
    height: number;
    layerCount: number;
}

export class Viewscreen extends React.PureComponent<ViewscreenProps> {
    processProps(props: ViewscreenProps) {
        for(let i = 0; i < props.layerCount; i ++) {
            let get = d.GetCanvas(`canvas-${i}`);
            d.SetCanvasAsLayer(get[1], i + 1);
        }
    }

    componentDidMount() {
        this.processProps(this.props);
    }
    componentDidUpdate(nextProps: ViewscreenProps) {
        this.processProps(nextProps);
    }

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
import * as React from 'react';
import { SMap } from '../../utils/utilTypes';
import { KeyCodes } from '../../utils/keyCodes';

export const Call = (fn: () => void) => fn();

export interface EasyKeyConfig {
	/**
	 * The action to perform when the key is pressed.
	 * The function passed will trigger the 'click' event of an element matched by buttonSelector.
	 * @param {() => void} click
	 */
	event: (click: () => void) => void;
	/**
	 * Either a '#id' or '.class' selector string to find a button.
	 * Can be scoped via contextElementSelector.
	 */
	buttonSelector?: string;
	/**
	 * Is the key disabled?
	 */
	disabled?: boolean;
	/**
	 * Any modifiers required?
	 */
	shift?: boolean;
	ctrl?: boolean;
	alt?: boolean;
}

export interface EasyKeysProps {
	/**
	 * {
     *    x: {
     *      fn: () => {},
     *      buttonSelector: '#project-complete-button',
     *      ctrl: true,
     *    }
     * }
	 */
	keys?: SMap<EasyKeyConfig>;
	/**
	 * Does not do anything for a key if the key's buttonSelector is not set
	 */
    contextElementSelector?: string;
    
    /**
     * Attaches an event listener for this function.
     * If props.config is specified, this runs before any config items.
     * Returns false => will prevent any config items from running.
     */
    keyWasPressed?: (event: KeyboardEvent) => boolean | undefined;
}

export class EasyKeys extends React.PureComponent<EasyKeysProps> {
	componentDidMount() {
		document.addEventListener('keydown', this.onPress);
	}

	componentWillUnmount() {
		document.removeEventListener('keydown', this.onPress);
	}

	onClick = (element: HTMLElement) => () => {
        // triggers the 'click' event on the element.
        element.click();
	};

	onPress = (e: KeyboardEvent) => {
        let willRunCommands = true;

        if (this.props.keyWasPressed) {
            let v = this.props.keyWasPressed(e);
            willRunCommands = v === true || v === undefined;
        }

        if (this.props.keys && willRunCommands) {
            // get the key name (toLowerCase because letters will capitalize while shift is held)
            let inputKey = e.key.toLowerCase();
            
            for (let k in this.props.keys) {
                if (inputKey === k || KeyCodes[k] === e.keyCode) {
                    let conf: EasyKeyConfig = this.props.keys[k];
                    
                    // if the config does not specify one of these, or the event says that it is pressed.
                    // all 3 must be true for the config function to be called
                    let shift = conf.shift !== true || e.shiftKey;
                    let alt = conf.alt !== true || e.altKey;
                    let ctrl = conf.ctrl !== true || e.ctrlKey;
                    
                    if (conf.disabled !== true && shift && alt && ctrl) {
                        if (!conf.buttonSelector) {
                            conf.event(() => {});
                        }
                        else if (conf.buttonSelector) {
                            let context = this.props.contextElementSelector ?
                                document.querySelector(this.props.contextElementSelector)
                                : document;
                            
                            if (context !== null) {
                                // we found the element context
                                if (context.querySelector(conf.buttonSelector) !== null) {
                                    // now we can get the specified button (though it may not actually be a buttons)
                                    conf.event(this.onClick(context.querySelector(conf.buttonSelector) as HTMLElement));
                                }
                            }
                            
                        }
                    }
                }
            }
        }
	};

	render() {
		return null;
	}
}
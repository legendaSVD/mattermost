import type {ReactNode} from 'react';
import React, {useRef} from 'react';
import type SettingItemMinComponent from 'components/setting_item_min';
import SettingItemMin from 'components/setting_item_min';
import useDidUpdate from './common/hooks/useDidUpdate';
type Props = {
    active: boolean;
    areAllSectionsInactive: boolean;
    section: string;
    max?: ReactNode;
    updateSection: (section: string) => void;
    title?: ReactNode;
    isDisabled?: boolean;
    describe?: ReactNode;
    collapsedEditButtonWhenDisabled?: ReactNode;
}
const SettingItem = ({
    active,
    areAllSectionsInactive,
    section,
    max,
    updateSection,
    title,
    isDisabled,
    describe,
    collapsedEditButtonWhenDisabled,
}: Props) => {
    const minRef = useRef<SettingItemMinComponent>(null);
    useDidUpdate(() => {
        if (!active && areAllSectionsInactive) {
            minRef.current?.focus();
        }
    }, [active]);
    if (active) {
        return <>{max}</>;
    }
    return (
        <SettingItemMin
            ref={minRef}
            title={title}
            updateSection={updateSection}
            describe={describe}
            section={section}
            isDisabled={isDisabled}
            collapsedEditButtonWhenDisabled={collapsedEditButtonWhenDisabled}
        />
    );
};
export default React.memo(SettingItem);
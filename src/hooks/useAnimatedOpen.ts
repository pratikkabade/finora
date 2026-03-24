import { useEffect, useState } from 'react';

export const MODAL_ANIMATION_DURATION_MS = 220;

export const useAnimatedOpen = (isOpen: boolean, duration = MODAL_ANIMATION_DURATION_MS) => {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isVisible, setIsVisible] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);

            const rafId = window.requestAnimationFrame(() => {
                setIsVisible(true);
            });

            return () => {
                window.cancelAnimationFrame(rafId);
            };
        }

        setIsVisible(false);

        if (!shouldRender) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setShouldRender(false);
        }, duration);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [duration, isOpen, shouldRender]);

    return { shouldRender, isVisible };
};

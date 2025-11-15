import { useEffect, useState } from "react";

export const useResponsiveText = (
    containerRef: React.RefObject<HTMLElement>,
    text: string,
    baseFontSize: number = 14,
    minFontSize: number = 10
) => {
    const [fontSize, setFontSize] = useState(baseFontSize);

    useEffect(() => {
        const calculateFontSize = () => {
            if (!containerRef.current) return;

            const containerWidth = containerRef.current.offsetWidth;
            if (!containerWidth) return;

            // Create a temporary element to measure text width
            const tempElement = document.createElement("span");
            tempElement.style.fontSize = `${baseFontSize}px`;
            tempElement.style.fontFamily = "inherit";
            tempElement.style.fontWeight = "inherit";
            tempElement.style.visibility = "hidden";
            tempElement.style.position = "absolute";
            tempElement.style.whiteSpace = "nowrap";
            tempElement.textContent = text;

            document.body.appendChild(tempElement);
            const textWidth = tempElement.offsetWidth;
            document.body.removeChild(tempElement);

            // Calculate the scale factor
            const scaleFactor = containerWidth / textWidth;
            const newFontSize = Math.max(minFontSize, Math.min(baseFontSize, baseFontSize * scaleFactor * 0.8));

            setFontSize(newFontSize);
        };

        calculateFontSize();

        // Add resize listener
        window.addEventListener("resize", calculateFontSize);

        // Cleanup
        return () => {
            window.removeEventListener("resize", calculateFontSize);
        };
    }, [containerRef, text, baseFontSize, minFontSize]);

    return fontSize;
};
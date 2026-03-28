"use client";
import {
  cloneElement,
  isValidElement,
  ReactElement,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

const ModalBase = ({
  children,
  className,
  onClose,
  notTransparent = false,
  bgColor = "bg-base-100",
}: {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  notTransparent?: boolean;
  bgColor?: string;
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  let childWithStop = children;

  if (isValidElement(children)) {
    // We now know children is a ReactElement with props
    const child = children as ReactElement<any>;

    childWithStop = cloneElement(child, {
      onClick: (e: MouseEvent) => {
        e.stopPropagation();
        child.props?.onClick?.(e); // keep existing onClick
      },
    });
  }

  return createPortal(
    <div
      className={`fixed inset-0 min-w-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-9999 ${
        notTransparent ? `bg-opacity-100 ${bgColor}` : "bg-opacity-50"
      } ${className} animate-in fade-in duration-200`}
      onClick={onClose}
    >
      <div className="max-h-100vh overflow-y-auto w-full items-center justify-center">
        <div className="flex-1 flex p-5 items-center justify-center">
          <div
            className="w-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ModalBase;

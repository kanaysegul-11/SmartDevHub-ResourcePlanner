"use client";
/*
 * Documentation:
 * Custom Component — https://app.subframe.com/9b74c91c3c48/library?component=Custom+Component_20ca774d-0a51-4393-ad40-fad0a4e02fb0
 */

import React from "react";
import * as SubframeUtils from "../utils";

interface CustomComponentRootProps
  extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const CustomComponentRoot = React.forwardRef<
  HTMLDivElement,
  CustomComponentRootProps
>(function CustomComponentRoot(
  { className, ...otherProps }: CustomComponentRootProps,
  ref
) {
  return (
    <div
      className={SubframeUtils.twClassNames(
        "flex flex-col items-start gap-2",
        className
      )}
      ref={ref}
      {...otherProps}
    />
  );
});

export const CustomComponent = CustomComponentRoot;

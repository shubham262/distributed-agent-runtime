"use client";

import React, { useState } from "react";
import { StyleProvider, createCache, extractStyle } from "@ant-design/cssinjs";
import { useServerInsertedHTML } from "next/navigation";
const AntdProvider = ({ children }) => {
	const [cache] = useState(() => createCache());
	useServerInsertedHTML(() => {
		return (
			<style
				dangerouslySetInnerHTML={{
					__html: extractStyle(cache, true),
				}}
			/>
		);
	});

	return <StyleProvider cache={cache}>{children}</StyleProvider>;
};

export default AntdProvider;

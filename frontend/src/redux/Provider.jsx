/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import React, { memo, useRef } from "react";
import { Provider } from "react-redux";
import makeStore from "./store";

const StoreProvider = ({ children }) => {
	const storeRef = useRef(null);
	if (!storeRef.current) {
		storeRef.current = makeStore();
	}

	return <Provider store={storeRef.current}>{children}</Provider>;
};

export default memo(StoreProvider);

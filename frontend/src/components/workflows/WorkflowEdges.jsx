"use client";

import React, { useCallback } from "react";
import {
	BaseEdge,
	EdgeLabelRenderer,
	getSmoothStepPath,
	useReactFlow,
} from "@xyflow/react";
import { FiX } from "react-icons/fi";

export const WORKFLOW_EDGE_TYPE = "deletableSmoothstep";

const DeletableSmoothStepEdge = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	style = {},
	markerEnd,
	selected,
}) => {
	const { deleteElements } = useReactFlow();

	const [edgePath, labelX, labelY] = getSmoothStepPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	const handleDelete = useCallback(
		(event) => {
			event.stopPropagation();
			deleteElements({ edges: [{ id }] });
		},
		[deleteElements, id]
	);

	return (
		<>
			<BaseEdge
				id={id}
				path={edgePath}
				markerEnd={markerEnd}
				style={{
					...style,
					...(selected ? { stroke: "#1d4ed8", strokeWidth: 2.5 } : {}),
				}}
			/>
			<EdgeLabelRenderer>
				<button
					type="button"
					onClick={handleDelete}
					aria-label="Delete connection"
					title="Delete connection"
					className={`nodrag nopan absolute flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 ${
						selected
							? "pointer-events-auto opacity-100"
							: "pointer-events-none opacity-0"
					}`}
					style={{
						transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
					}}
				>
					<FiX className="text-sm" />
				</button>
			</EdgeLabelRenderer>
		</>
	);
};

export const workflowEdgeTypes = {
	[WORKFLOW_EDGE_TYPE]: DeletableSmoothStepEdge,
	smoothstep: DeletableSmoothStepEdge,
};

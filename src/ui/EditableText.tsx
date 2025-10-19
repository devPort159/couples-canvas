import { useState, useRef, useEffect } from "react";

type EditableTextProps = {
	value: string | undefined;
	placeholder: string;
	onSave: (value: string) => void;
	isEditable: boolean;
	className?: string;
	inputClassName?: string;
	as?: "h1" | "h2" | "p";
	multiline?: boolean;
};

export default function EditableText({
	value,
	placeholder,
	onSave,
	isEditable,
	className = "",
	inputClassName = "",
	as: Component = "p",
	multiline = false,
}: EditableTextProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(value ?? "");
	const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

	useEffect(() => {
		setEditValue(value ?? "");
	}, [value]);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const handleSave = () => {
		setIsEditing(false);
		const trimmed = editValue.trim();
		if (trimmed !== value) {
			onSave(trimmed);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !multiline) {
			e.preventDefault();
			handleSave();
		}
		if (e.key === "Escape") {
			setEditValue(value ?? "");
			setIsEditing(false);
		}
	};

	const displayText = value || placeholder;
	const isEmpty = !value;

	if (isEditing && isEditable) {
		const InputComponent = multiline ? "textarea" : "input";
		// Calculate rows based on content (minimum 1, maximum 4)
		const lineCount = editValue ? editValue.split('\n').length : 1;
		const rows = multiline ? Math.min(Math.max(lineCount, 1), 4) : undefined;
		
		return (
			<InputComponent
				ref={inputRef as any}
				type="text"
				value={editValue}
				onChange={(e) => setEditValue(e.target.value)}
				onBlur={handleSave}
				onKeyDown={handleKeyDown}
				className={`w-full bg-transparent border-b-2 border-neutral-900 focus:outline-none ${inputClassName} ${className}`}
				rows={rows}
			/>
		);
	}

	return (
		<Component
			onClick={() => isEditable && setIsEditing(true)}
			className={`${className} ${
				isEditable
					? "cursor-text hover:opacity-70 transition-opacity"
					: ""
			} ${isEmpty ? "text-neutral-400" : ""}`}
			title={isEditable ? "Click to edit" : undefined}
		>
			{displayText}
		</Component>
	);
}


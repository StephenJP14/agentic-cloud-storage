"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Link as LinkIcon,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Eraser,
} from "lucide-react";

export default function RichTextEditor({
    value,
    onChange,
}: {
    value: string;
    onChange: (val: string) => void;
}) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link,
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
        ],
        content: value,
        immediatelyRender: false,
        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose max-w-none p-4 min-h-[260px] focus:outline-none",
            },
        },
    });

    if (!editor) return null;

    const setLink = () => {
        const prev = editor.getAttributes("link").href;
        const url = window.prompt("URL", prev);
        if (url === null) return;
        if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
        }
        editor.chain().focus().setLink({ href: url }).run();
    };

    const ToolbarButton = ({ onClick, active, children }: any) => (
        <button
            type="button"
            onClick={onClick}
            className={`p-2 rounded-md border text-sm hover:bg-gray-100 transition
                ${active ? "bg-gray-200 border-gray-300" : "border-transparent"}
            `}
        >
            {children}
        </button>
    );

    return (
        <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">

            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-300 bg-gray-50">

                {/* STYLE */}
                <select
                    className="rounded-md px-2 py-1 text-sm"
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === "p") editor.chain().focus().setParagraph().run();
                        if (v === "h1") editor.chain().focus().setHeading({ level: 1 }).run();
                        if (v === "h2") editor.chain().focus().setHeading({ level: 2 }).run();
                        if (v === "h3") editor.chain().focus().setHeading({ level: 3 }).run();
                    }}
                >
                    <option value="p">Normal</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                </select>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* FORMAT */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive("bold")}
                >
                    <Bold size={16} />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive("italic")}
                >
                    <Italic size={16} />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive("underline")}
                >
                    <UnderlineIcon size={16} />
                </ToolbarButton>

                <ToolbarButton onClick={setLink} active={editor.isActive("link")}>
                    <LinkIcon size={16} />
                </ToolbarButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* LIST */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive("bulletList")}
                >
                    <List size={16} />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive("orderedList")}
                >
                    <ListOrdered size={16} />
                </ToolbarButton>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                    active={editor.isActive({ textAlign: "left" })}
                >
                    <AlignLeft size={16} />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                    active={editor.isActive({ textAlign: "center" })}
                >
                    <AlignCenter size={16} />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                    active={editor.isActive({ textAlign: "right" })}
                >
                    <AlignRight size={16} />
                </ToolbarButton>


                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* CLEAR */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                    active={false}
                >
                    <Eraser size={16} />
                </ToolbarButton>
            </div>

            {/* EDITOR */}
            <EditorContent editor={editor} />
        </div>
    );
}

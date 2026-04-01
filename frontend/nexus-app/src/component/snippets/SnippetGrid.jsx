"use client";
import React from "react";
import SnippetCard from "./SnippetCard";

function SnippetGrid({ snippets, onSnippetClick, onSnippetEdit }) {
  return (
    <div className="grid w-full grid-cols-1 gap-6 px-8 py-8 md:grid-cols-2 xl:grid-cols-3">
      {snippets.map((snippet) => (
        <SnippetCard
          key={snippet.id}
          snippet={snippet}
          onClick={() => onSnippetClick(snippet)}
          onEdit={() => onSnippetEdit?.(snippet)}
        />
      ))}
    </div>
  );
}

export default SnippetGrid;

import React from 'react';

// Converts **bold** markdown-style syntax into <strong> tags and turns
// newlines into <br /> line breaks for rendering chat bot/user messages.
export function formattedAiResponse(text) {
  const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return bolded.split('\n').map((line, idx) => (
    <React.Fragment key={idx}>
      <span dangerouslySetInnerHTML={{ __html: line }} />
      <br />
    </React.Fragment>
  ));
}

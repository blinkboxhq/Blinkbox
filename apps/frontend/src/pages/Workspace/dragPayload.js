// The HTML drag-and-drop spec blanks out dataTransfer during dragover — the
// payload is only readable on drop. The canvas needs it earlier than that to
// draw the landing ghost, so the pickers stash it here on dragstart.

let payload = null;

export const setDragPayload = (next) => {
  payload = next;
};

export const getDragPayload = () => payload;

export const clearDragPayload = () => {
  payload = null;
};

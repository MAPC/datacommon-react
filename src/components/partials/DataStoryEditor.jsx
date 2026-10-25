import { useLayoutEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFont, faListOl, faListUl } from "@fortawesome/free-solid-svg-icons";

import { dataStoryTitleMax } from "../../utils/dataStory";

function selectionInside(editor) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editor) return null;
  const anchor = selection.anchorNode;
  if (!anchor || !editor.contains(anchor)) return null;
  return selection.getRangeAt(0).cloneRange();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function DataStoryEditor({
  title,
  bodyHtml,
  revision,
  shareUrl,
  shareMessage,
  shareError,
  pdfMessage,
  busy,
  pdfBusy,
  canShare,
  canExport,
  onTitleChange,
  onBodyChange,
  onShare,
  onExportPdf,
}) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const linkInputRef = useRef(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("https://");
  const [linkText, setLinkText] = useState("");
  const [linkHasSelection, setLinkHasSelection] = useState(false);
  const [blockTag, setBlockTag] = useState("p");
  const [textColor, setTextColor] = useState("#1f4e46");
  const [empty, setEmpty] = useState(!String(bodyHtml || "").trim());

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Fill the editor only when a new story is loaded, not on every keystroke.
    // Rewriting the content while someone types would jump their cursor to the start.
    editor.innerHTML = bodyHtml || "";
    setEmpty(!editor.textContent.trim());
    // bodyHtml is read for the revision that loaded it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  const emitBody = () => {
    const editor = editorRef.current;
    if (!editor) return;
    setEmpty(!editor.textContent.trim());
    onBodyChange(editor.innerHTML);
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    editor?.focus();
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (!range || !selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const applyCommand = (command, value = null) => {
    restoreSelection();
    document.execCommand(command, false, value);
    emitBody();
  };

  const applyBlock = (tag) => {
    restoreSelection();
    const normalized = tag === "h2" || tag === "h3" ? tag : "p";
    document.execCommand("formatBlock", false, normalized);
    let applied = String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");
    if (applied !== normalized) {
      document.execCommand("formatBlock", false, `<${normalized}>`);
      applied = String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");
    }
    if (applied !== normalized) {
      const editor = editorRef.current;
      const selection = window.getSelection();
      const node = selection?.anchorNode;
      const block = node && editor?.contains(node)
        ? (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest("h2, h3, p, blockquote, div")
        : null;
      if (block && editor.contains(block) && block !== editor && block.tagName.toLowerCase() !== normalized) {
        const replacement = document.createElement(normalized);
        while (block.firstChild) replacement.appendChild(block.firstChild);
        block.replaceWith(replacement);
      }
    }
    setBlockTag(normalized);
    emitBody();
  };

  const applyColor = (value) => {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    setTextColor(value);
    restoreSelection();
    document.execCommand("foreColor", false, value);
    emitBody();
  };

  const clearFormatting = () => {
    restoreSelection();
    document.execCommand("removeFormat");
    document.execCommand("unlink");
    document.execCommand("formatBlock", false, "p");
    emitBody();
  };

  const rememberSelection = () => {
    const range = selectionInside(editorRef.current);
    if (!range) return;
    savedRangeRef.current = range;
    const applied = String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");
    setBlockTag(applied === "h2" || applied === "h3" ? applied : "p");
    const rgb = String(document.queryCommandValue("foreColor") || "").match(/^rgb\((\d+), (\d+), (\d+)\)$/);
    if (rgb) setTextColor(`#${rgb.slice(1).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}`);
  };

  const openLink = () => {
    rememberSelection();
    const range = savedRangeRef.current;
    const selected = range && !range.collapsed ? range.toString().trim() : "";
    setLinkHasSelection(Boolean(selected));
    setLinkText(selected);
    setLinkOpen(true);
    setLinkValue("https://");
    window.setTimeout(() => linkInputRef.current?.focus(), 0);
  };

  const applyLink = () => {
    let href = linkValue.trim();
    if (!href || href === "https://") {
      setLinkOpen(false);
      return;
    }
    if (!/^(https?:\/\/|mailto:)/i.test(href)) {
      href = `https://${href}`;
    }
    if (!/^(https?:\/\/|mailto:)/i.test(href) || /[\s<>"']/.test(href)) {
      return;
    }
    restoreSelection();
    const range = savedRangeRef.current;
    const editor = editorRef.current;
    if (range && !range.collapsed) {
      document.execCommand("createLink", false, href);
      editor?.querySelectorAll("a").forEach((anchor) => {
        if (anchor.getAttribute("href") !== href) return;
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
      });
    } else {
      const label = linkText.trim() || href.replace(/^mailto:/i, "").replace(/^https?:\/\//i, "");
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
      );
    }
    setLinkOpen(false);
    emitBody();
  };

  const onPaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    document.execCommand("insertText", false, text);
    emitBody();
  };

  return (
    <section className="data-story" aria-label="Data story">
      <h2 id="data-story-heading">Data story</h2>
      <p className="data-story__intro">
        Write a description of this map, then share it via a link or export it as a PDF.
      </p>
      <label className="data-story__title-field">
        <span>Title</span>
        <input
          type="text"
          value={title}
          maxLength={dataStoryTitleMax}
          placeholder="Story title"
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
      <div className="data-story__toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("bold")} aria-label="Bold">
          <strong>B</strong>
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("italic")} aria-label="Italic">
          <em>I</em>
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("underline")} aria-label="Underline">
          <u>U</u>
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("strikeThrough")} aria-label="Strikethrough">
          <s>S</s>
        </button>
        <select
          className="data-story__heading"
          aria-label="Heading"
          value={blockTag}
          onMouseDown={rememberSelection}
          onChange={(event) => applyBlock(event.target.value)}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("insertUnorderedList")} aria-label="Bulleted list">
          <FontAwesomeIcon icon={faListUl} />
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("insertOrderedList")} aria-label="Numbered list">
          <FontAwesomeIcon icon={faListOl} />
        </button>
        <label className="data-story__color">
          <FontAwesomeIcon icon={faFont} />
          <span className="data-story__color-bar" style={{ background: textColor }} />
          <input
            type="color"
            aria-label="Text color"
            value={textColor}
            onMouseDown={rememberSelection}
            onChange={(event) => applyColor(event.target.value)}
          />
        </label>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("insertHorizontalRule")} aria-label="Divider">
          Line
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={clearFormatting} aria-label="Clear formatting">
          Clear
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            rememberSelection();
          }}
          onClick={openLink}
          aria-label="Link"
          aria-expanded={linkOpen}
        >
          Link
        </button>
      </div>
      {linkOpen && (
        <form
          className="data-story__link-form"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <p className="data-story__link-hint">
            {linkHasSelection
              ? "The highlighted text will link to this address."
              : "Highlight words in the story, or type the text to show."}
          </p>
          {!linkHasSelection && (
            <label className="data-story__link-text">
              <span>Text</span>
              <input
                type="text"
                value={linkText}
                onChange={(event) => setLinkText(event.target.value)}
                placeholder="Words to link"
                aria-label="Link text"
              />
            </label>
          )}
          <label>
            <input
              ref={linkInputRef}
              type="url"
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              placeholder="https://"
              aria-label="Link address"
            />
          </label>
          <button type="submit">Add link</button>
          <button type="button" onClick={() => setLinkOpen(false)}>Cancel</button>
        </form>
      )}
      <div
        ref={editorRef}
        className={`data-story__editor${empty ? " is-empty" : ""}`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Story text"
        data-placeholder="Add context or a note about this map."
        onInput={emitBody}
        onBlur={rememberSelection}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onPaste={onPaste}
      />
      <div className="data-story__actions">
        <button type="button" className="data-story__share" onClick={onShare} disabled={!canShare || busy || pdfBusy}>
          {busy ? "Preparing link…" : "Share story"}
        </button>
        <button type="button" className="data-story__pdf" onClick={onExportPdf} disabled={!canExport || busy || pdfBusy}>
          {pdfBusy ? "Preparing PDF…" : "Export PDF"}
        </button>
      </div>
      {shareMessage && <p className="data-story__status" role="status">{shareMessage}</p>}
      {shareError && <p className="data-story__status data-story__status--error" role="alert">{shareError}</p>}
      {pdfMessage && <p className="data-story__status" role="status">{pdfMessage}</p>}
      {shareUrl && (
        <label className="data-story__url-field">
          <span>Story link</span>
          <input type="text" readOnly value={shareUrl} onFocus={(event) => event.target.select()} />
        </label>
      )}
    </section>
  );
}

DataStoryEditor.propTypes = {
  title: PropTypes.string,
  bodyHtml: PropTypes.string,
  revision: PropTypes.number,
  shareUrl: PropTypes.string,
  shareMessage: PropTypes.string,
  shareError: PropTypes.string,
  pdfMessage: PropTypes.string,
  busy: PropTypes.bool,
  pdfBusy: PropTypes.bool,
  canShare: PropTypes.bool,
  canExport: PropTypes.bool,
  onTitleChange: PropTypes.func.isRequired,
  onBodyChange: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
  onExportPdf: PropTypes.func.isRequired,
};

DataStoryEditor.defaultProps = {
  title: "",
  bodyHtml: "",
  revision: 0,
  shareUrl: "",
  shareMessage: "",
  shareError: "",
  pdfMessage: "",
  busy: false,
  pdfBusy: false,
  canShare: false,
  canExport: false,
};

export default DataStoryEditor;

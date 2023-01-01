const el = (id) => document.getElementById(id);

//Code textarea
const codeField = el("code-editor");

//Result window
const resultWindow = el("result-window");

//Result windows btns
const scanerBtn = el("scanner");
const tokensBtn = el("tokens");
const errorsBtn = el("errors");
const parserBtn = el("parser");

//Full PST view
const fullPSTHolder = el("full-pst-holder");
const fullPSTCloseBtn = el("closeBtn");
const fullPST = el("full-pst");
const fullPSTContent = el("full-pst-content");

//Hidden PST
const hiddenPST = el("PST-hidden");

//Badges
const tokensBadge = el("tokensBadge");
const errorsBadge = el("errorsBadge");

const windowsBtns = [scanerBtn, tokensBtn, errorsBtn, parserBtn];

//Active window
let activeWindow = "scanner";

const resultWindows = {
    scanner:
        "<div id='scaned'><div id='lines'></div><div id='code'></div></div>",
    tokens: "",
    errors: "",
    parser: "<div id='PST'></div>",
};

let tokensList = [];

const scanner = new Scanner();

//Generate table for tokens or errors
function generateTable(data = [], emptyMsg, col) {
    const tableHead = `<table><tr><th>${col.join("</th><th>")}</th><tr>`;
    const tableRows = data.reduce((prev, curr) => {
        const row = `<tr><td>${Object.values(curr).join(
            "</td><td>"
        )}</td></tr>`;
        return prev + row;
    }, "");

    const empty = !data.length
        ? `<tr><td colspan="${col.length}">${emptyMsg}</td></tr>`
        : "";

    return tableHead + tableRows + empty + "</table>";
}

//Switch windows
function changeWindow(event) {
    activeWindow = event.target.id;
    resultWindow.innerHTML = resultWindows[activeWindow];
    windowsBtns.forEach((btn) => {
        if (btn.id === activeWindow) btn.className = "active";
        else btn.className = "";
    });
    refresh();
}

//Color tokens in scanner
/**
 * Color the token for scanmer
 * @param {Token} token - Token
 * @param {String} error - Error text to be displayed (if exists)
 * @param {Object} parserError - Token index
 */
function colorToken({ tokenType, tokenVal }, error = "", parserError = null) {
    let className = "";

    switch (tokenType) {
        case "IF":
        case "THEN":
        case "ELSE":
        case "END":
        case "REPEAT":
        case "UNTIL":
            className = "scan-keyword";
            break;

        case "COMMENT":
            tokenVal = tokenVal
                .replace(/\n/g, "<br>")
                .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
                .replace(/\s/g, "&nbsp;");
            className = "scan-comment";
            break;

        case "ID":
            className = "scan-id";
            break;

        case "NUMBER":
            className = "scan-color";
            break;

        case "READ":
        case "WRITE":
            className = "scan-function";
            break;

        case "INVALID":
            className = "scan-invalid";
            break;

        default:
            className = "scan-operator";
            break;
    }

    if (parserError) {
        error = parserError.msg;
        className += " parser-invalid";
    }
    return `<span class="${className}" error="${error}">${tokenVal}</span>`;
}

/**
 * Color the code for scanmer
 * @param {String} code
 * @param {[Token]} tokens
 * @param {[String]} scannerErrors
 * @param {Object} parserError
 * @param {Number} parserError.tokenIndex
 * @returns {String} Html styled string
 */
function colorCode(code, tokens, scannerErrors, parserError) {
    let i = 0; //Code index
    let ti = 0; //Token index
    let tiNoComment = 0;
    let ei = 0; //Error index
    let result = "";
    while (i < code.length) {
        const char = code[i];
        const token = tokens[ti];

        switch (char) {
            case "\n":
                result += "<br />";
                break;

            case " ":
                result += "&nbsp;";
                break;

            case "\t":
                result += "&nbsp;&nbsp;&nbsp;&nbsp;";
                break;

            default:
                if (char) {
                    try {
                        let error = "";
                        if (token.tokenType === "INVALID") {
                            error = scannerErrors[ei++].msg;
                        } else if (
                            parserError &&
                            tiNoComment === parserError.tokenIndex
                        ) {
                            error = parserError.tokenIndex;
                        }
                        const p = parserError?.tokenIndex === tiNoComment;
                        result += colorToken(
                            token,
                            error,
                            p ? parserError : null
                        );
                        i += token.tokenVal.length - 1;
                        ti++;
                        if (token.tokenType !== "COMMENT") tiNoComment++;
                    } catch (e) {
                        console.log(e);
                    }
                }
                break;
        }

        i++;
    }

    return result;
}
//if

//Refresh windows
function refresh() {
    const code = codeField.value;
    const { tokens, errors: scannerErrors } = scanner.scan(code);

    //Set tokens
    const tokensEmptyMsg = "No tokens found";
    const tokensCols = ["Line", "Token type", "Token value"];
    const tokensFiltered = tokens.filter(
        ({ tokenType }) => tokenType !== "COMMENT"
    );
    tokensList = tokensFiltered;
    resultWindows.tokens = generateTable(
        tokensFiltered,
        tokensEmptyMsg,
        tokensCols
    );

    tokensBadge.innerText = tokensFiltered.length;

    //Set errors
    const errorsEmptyMsg = "No errors found";
    const errorsCols = ["Errors"];
    const errorMsgs = scannerErrors.map((err) => {
        return { msg: `${err.msg} at line ${err.lineNo}` };
    });
    resultWindows.errors = generateTable(errorMsgs, errorsEmptyMsg, errorsCols);

    errorsBadge.innerText = scannerErrors.length;

    //Set parser
    resultWindows.parser = "<div id='PST'></div>";
    let parserError = null;
    if (!errorMsgs.length) {
        const p = new Parser(tokens);
        const { sucess, error, root } = p.parse();

        if (sucess) {
            if (root) {
                const graph = new ParseTreeGraph("#PST-hidden");
                graph.drawParseTree(root);

                if (activeWindow === "parser") {
                    resultWindows.parser = `<div id="PST">${hiddenPST.innerHTML}</div>`;
                }
            }
        } else {
            errorsBadge.innerText = 1;
            resultWindows.errors = generateTable(
                [{ msg: error.msg }],
                errorsEmptyMsg,
                errorsCols
            );
            parserError = error;
            //show error msg in parser screen
        }
    }

    //Set scanner
    const linesNo = code.split("\n").length;
    const lines = Array.from(
        { length: linesNo },
        (_, i) => `${i + 1}<br/> `
    ).join("");

    const scanned = colorCode(code, tokens, scannerErrors, parserError);
    resultWindows.scanner = `<div id='scaned'><div id='lines'>${lines}</div><div id='scaned-code'>${scanned}</div></div>`;

    resultWindow.innerHTML = resultWindows[activeWindow];

    if (activeWindow === "parser") {
        const PST = el("PST");
        if (PST?.innerHTML) {
            PST.setAttribute("view", "View");
            PST.style.cursor = "pointer";
            PST.addEventListener("click", () => {
                if (PST.innerHTML) {
                    fullPSTHolder.style.display = "block";
                    fullPSTContent.innerHTML = hiddenPST.innerHTML;
                    const vb = el("pst-svg").getAttribute("viewBox").split(" ");
                    const width = vb[2];
                    const height = vb[3];
                    fullPSTContent.style.width = `${width}px`;
                    fullPSTContent.style.height = `${height}px`;
                }
            });
        } else PST.setAttribute("view", "No Parse tree");
    }
}

fullPSTCloseBtn.addEventListener("click", () => {
    fullPSTHolder.style.display = "none";
});

//Add event listner to windows buttons
windowsBtns.forEach((btn) => btn.addEventListener("click", changeWindow));

//Refresh on each code input
codeField.addEventListener("input", refresh);

//Listen to menu events
window.API.openFileHandle((_, value) => {
    codeField.value = value;
    refresh();
});

window.API.clearHandle(() => {
    codeField.value = "";
    refresh();
});

window.API.saveHandle((event) => {
    if (hiddenPST.innerHTML && tokensList.length) {
        const image = d3
            .select("#pst-svg")
            .attr("title", "Parse tree")
            .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .node().parentNode.innerHTML;

        const data = {
            code: codeField.value,
            tokens: tokensList,
            image,
        };

        window.API.save(data);

        el("saved").style.display = "grid";
        el("ok-save").addEventListener("click", () => {
            el("saved").style.display = "none";
        });
    }
});

refresh();

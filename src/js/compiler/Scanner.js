class Scanner {
    #KEYWORDS = [
        "if",
        "then",
        "else",
        "end",
        "repeat",
        "until",
        "read",
        "write",
    ];
    #OP = ["+", "-", "*", "/", "<", ">", "=", ":", "(", ")", ";"];
    #OP_TYPES = {
        "+": "PLUS",
        "-": "MINUS",
        "*": "MULT",
        "/": "DIV",
        "<": "LESSTHAN",
        ">": "MORETHAN",
        "=": "EQUAL",
        ":=": "ASSIGN",
        "(": "OPENBRACKET",
        ")": "CLOSEBRACKET",
        ";": "SEMICOLON",
    };

    #code = "";
    tokens = [];
    errors = [];

    /**
     * Create new scanner
     * @param {String} code - Tiny language code
     */
    constructor(code) {
        if (code) {
            this.#code = code;
            this.scan(code);
        }
    }

    /**
     * Check if character is alphabetic letter
     * @param {String} char
     * @returns {Boolean}
     */
    #isAlpha(char) {
        const code = char.charCodeAt(0);
        return (code > 64 && code < 91) || (code > 96 && code < 123);
    }

    /**
     * Check if character is numeric
     * @param {String} char
     * @returns {Boolean}
     */
    #isNumeric(char) {
        const code = char.charCodeAt(0);
        return code > 47 && code < 58;
    }

    /**
     * Check if character is alphanumeric
     * @param {String} char
     * @returns {Boolean}
     */
    #isAlphanum(char) {
        return this.#isAlpha(char) || this.#isNumeric(char);
    }

    /**
     * Check if character is one of the accepted operators
     * @param {String} char
     * @returns {Boolean}
     */
    #isOperator(char) {
        return this.#OP.includes(char);
    }

    /**
     * Check if character marks the end of a token
     * @param {String} char
     * @returns {Boolean}
     */
    #isTokenEnd(char) {
        return ["{", " ", "\n", ";", "\t"].includes(char);
    }

    /**
     * Check if token is a keyword
     * @param {String} token
     * @returns {String | undefined}
     */
    #isKeyword(token) {
        return this.#KEYWORDS.find((keyword) => keyword === token);
    }

    /**
     * Add token to tokens list
     * @param {Number} lineNo - Line number
     * @param {TokenType} tokenType - Token type
     * @param {String} tokenVal - Token value
     */
    #addToken(lineNo, tokenType, tokenVal) {
        this.tokens.push({ lineNo, tokenType, tokenVal });
    }

    /**
     * Add error to errors list
     * @param {Number} lineNo - Line number
     * @param {Number} charNo - Character number
     * @param {String} msg - Error message
     */
    #addError(lineNo, charNo, msg) {
        this.errors.push({ lineNo, charNo, msg });
    }

    /**
     * Scan tiny language code
     * @param {String} code
     * @returns {Results} Scan results
     */
    scan(code = this.#code) {
        this.tokens = [];
        this.errors = [];
        let lineNo = 1,
            token = "",
            state = "START",
            errorMsg = null,
            index = 0,
            char = code[0],
            isFloat = false; //Float point

        //Iterate over each character
        for (; index < code.length; char = code[++index]) {
            //---------------------------------------------------------//
            //----------------- Found token terminator ----------------//
            //---------------------------------------------------------//

            if (this.#isTokenEnd(char)) {
                //Change state
                switch (state) {
                    //NUMBER or ID state
                    case "NUMBER":
                        if (isFloat) isFloat = false;
                    case "ID":
                        this.#addToken(lineNo, state, token);
                        break;

                    //OPERATOR state
                    case "OPERATOR":
                        this.#addToken(lineNo, this.#OP_TYPES[token], token);
                        break;

                    //COMMENT state
                    case "COMMENT":
                        token += char; //Comment is terminated by "}"
                        break;

                    //RES_OR_ID state
                    case "RES_OR_ID":
                        const keyword = this.#isKeyword(token);
                        if (keyword)
                            this.#addToken(
                                lineNo,
                                keyword.toUpperCase(),
                                token
                            );
                        else this.#addToken(lineNo, "ID", token);
                        break;

                    //INVALID or ASSIGN state
                    case "ASSIGN": //found ":" instead of ":="
                    case "INVALID":
                        this.#addToken(lineNo, "INVALID", token);
                        const charNo = index - token.length;
                        const msg = errorMsg || "Unrecognized token";
                        this.#addError(lineNo, charNo, msg + ` '${token}'`);
                        errorMsg = null;
                        break;

                    //START state
                    default:
                        break;
                }

                if (char === "\n") lineNo++;
                else if (state !== "COMMENT") {
                    if (char === "{" && state !== "COMMENT") {
                        token = "{";
                        state = "COMMENT";
                    } else if (char === ";")
                        this.#addToken(lineNo, "SEMICOLON", ";");
                }

                if (state !== "COMMENT") state = "START";
            }

            //---------------------------------------------------------//
            //----------------- Found a non terminator ----------------//
            //---------------------------------------------------------//
            else {
                switch (state) {
                    //NUMBER state
                    case "NUMBER":
                        //Found a number
                        if (this.#isNumeric(char)) token += char;
                        //Found a decimal point (.)
                        else if (char === "." && !isFloat) {
                            token += char;
                            isFloat = true;
                        }
                        //Found an Operator
                        else if (this.#isOperator(char)) {
                            this.#addToken(lineNo, "NUMBER", token);
                            token = char;
                            state = char === ":" ? "ASSIGN" : "OPERATOR";
                        }
                        //Otherwise
                        else {
                            token += char;
                            errorMsg =
                                "Extra text after expected end of number";
                            state = "INVALID";
                        }
                        break;

                    //ID state
                    case "ID":
                        //Found a number or letter
                        if (this.#isAlphanum(char)) token += char;
                        //Found an operator
                        else if (this.#isOperator(char)) {
                            this.#addToken(lineNo, "ID", token);
                            token = char;
                            state = char === ":" ? "ASSIGN" : "OPERATOR";
                        }
                        //Otherwise
                        else {
                            token += char;
                            errorMsg = "Invalid identifier name";
                            state = "INVALID";
                        }
                        break;

                    //OPERATOR state
                    case "OPERATOR":
                        //Found a number
                        if (this.#isNumeric(char)) {
                            this.#addToken(
                                lineNo,
                                this.#OP_TYPES[token],
                                token
                            );
                            token = char;
                            state = "NUMBER";
                        }
                        //Found a letter
                        else if (this.#isAlpha(char)) {
                            this.#addToken(
                                lineNo,
                                this.#OP_TYPES[token],
                                token
                            );
                            token = char;
                            state = "RES_OR_ID";
                        }
                        //Found "+" or "-" indicating a number
                        else if (["+", "-", "(", ")"].includes(char)) {
                            this.#addToken(
                                lineNo,
                                this.#OP_TYPES[token],
                                token
                            );
                            token = char;
                        }
                        //Otherwise
                        else {
                            token += char;
                            errorMsg = "Invalid operator";
                            state = "INVALID";
                        }
                        break;

                    //COMMENT state
                    case "COMMENT":
                        //Comment ended
                        if (char === "}") {
                            this.#addToken(lineNo, "COMMENT", `${token}}`);
                            state = "START";
                        }
                        //Comment not over yet
                        else token += char;
                        break;

                    //RES_OR_ID state
                    case "RES_OR_ID":
                        //Found a number
                        if (this.#isNumeric(char)) {
                            token += char;
                            state = "ID";
                        }
                        //Found a letter
                        else if (this.#isAlpha(char)) token += char;
                        //Found an operator
                        else if (this.#isOperator(char)) {
                            const keyword = this.#isKeyword(token);
                            if (keyword)
                                this.#addToken(
                                    lineNo,
                                    keyword.toUpperCase(),
                                    token
                                );
                            else this.#addToken(lineNo, "ID", token);
                            token = char;
                            state = char === ":" ? "ASSIGN" : "OPERATOR";
                        }
                        //Otherwise
                        else {
                            token += char;
                            errorMsg = "Invalid identifier name";
                            state = "INVALID";
                        }
                        break;

                    //ASSIGN state
                    case "ASSIGN":
                        if (char === "=") {
                            this.#addToken(lineNo, "ASSIGN", ":=");
                            state = "START";
                        } else {
                            token += char;
                            state = "INVALID";
                        }
                        break;

                    //INVALID state
                    case "INVALID":
                        token += char;
                        break;

                    //START state
                    default:
                        if (this.#isNumeric(char)) state = "NUMBER";
                        else if (this.#isAlpha(char)) state = "RES_OR_ID";
                        else if (char === ":") state = "ASSIGN";
                        else if (this.#isOperator(char)) state = "OPERATOR";
                        else state = "INVALID";
                        token = char;
                        break;
                }
            }
        }

        //Finished scanning, handling last token
        if (token) {
            switch (state) {
                //NUMBER, ID, or OPERATOR
                case "OPERATOR":
                    state = this.#OP_TYPES[token];
                case "NUMBER":
                case "ID":
                    this.#addToken(lineNo, state, token);
                    break;

                //Non-terminated comment
                case "COMMENT":
                    this.#addToken(lineNo, "COMMENT", `${token}`);
                    this.#addError(
                        lineNo,
                        code.length,
                        "Unterminated comment, expected '}'"
                    );
                    break;

                //RES_OR_ID state
                case "RES_OR_ID":
                    const keyword = this.#isKeyword(token);
                    if (keyword)
                        this.#addToken(lineNo, keyword.toUpperCase(), token);
                    else this.#addToken(lineNo, "ID", token);
                    break;

                //INVALID or ASSIGN state
                case "ASSIGN": //found ":" instead of ":="
                case "INVALID":
                    this.#addToken(lineNo, "INVALID", token);
                    const charNo = index - token.length;
                    const msg = errorMsg || "Unrecognized token";
                    this.#addError(lineNo, charNo, msg + ` '${token}'`);
                    errorMsg = null;
                    break;

                //START state
                default:
                    break;
            }
        }

        return { tokens: this.tokens, errors: this.errors };
    }
}

/**
 * @typedef {"COMMENT" |
 * "ID" | "NUMBER" | "OPERATOR" |
 * "WRITE" | "READ" |
 * "IF" | "THEN" | "ELSE" | "END" |
 * "REPEAT" | "UNTIL" |
 * "PLUS"| "MINUS"| "MULT"| "DIV"|
 * "LESSTHAN"| "MORETHAN"| "EQUAL"|
 * "ASSIGN"|
 * "OPENBRACKET"| "CLOSEBRACKET"|
 * "SEMICOLON"|
 * "INVALID" | "UNEXPECTED"
 * } TokenType
 */

/**
 * @typedef {Object} Token
 * @property {TokenType} tokenType - Token type
 * @property {String} tokenVal - Token value
 * @property {Number} lineNo - Line number
 */

/**
 * @typedef {Object} CompilerError
 * @property {Number} lineNo - Line number
 * @property {Number} charNo - Character number
 * @property {String} msg - Error message
 */

/**
 * @typedef {Object} Results
 * @property {[Token]} tokens
 * @property {[CompilerError]} errors
 */

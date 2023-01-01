/*
EBNF

✔️ program --> stmtSeq

✔️ stmtSeq --> statement {;statement}

✔️ statement --> ifStmt | repeatStmt | assignStmt | readStmt | writeStmt 

✔️ ifStmt --> if exp then stmtSeq [else stmtSeq] end

✔️ repeatStmt --> repeat stmtSeq until exp

✔️ assignStmt --> ID := exp

✔️ readStmt --> read ID

✔️ writeStmt --> write exp

✔️ exp --> simple_exp [compOp simple_exp]

✔️ simple_exp --> term {[addOp term]}

✔️ term --> factor {[mulOp factor]}

✔️ factor --> (exp) | number | ID

✔️ addOp --> + | -

✔️ compOp --> < | =

✔️ mulOp --> * | /

*/

class Parser {
    /**@type {[Token]} Array of scanned tokens */
    tokens = [];

    /**@type {Number} */
    #index = 0;

    //Parse tree

    /**@type {TreeNode} Root node of parse tree */
    #root = null;

    /**@type {TreeNode} Root node of parse tree */
    #lastNode = null;

    /**@type {[TreeNode]} Stack for statment nodes */
    #stmtStack = [];

    /**@type {Boolean} */
    #sibling = false;

    /**@type {[Token]} */
    #operations = [];

    /**
     * Initalize parser
     * @param {[Token]} tokens
     */
    constructor(tokens) {
        this.tokens = tokens.filter((token) => token.tokenType !== "COMMENT");
    }

    /**
     * Match token with exected type
     * @param {TokenType} tokenType
     * @param {String?} errMsg
     */
    match(tokenType, errMsg = "") {
        if (this.#index === this.tokens.length) {
            const lineNo = this.tokens[this.tokens.length - 1].lineNo;
            const msg = `Unexpected end of code at line ${lineNo} ${errMsg}`;
            const err = new Error(msg);
            err.tokenIndex = this.#index;
            throw err;
        }

        const token = this.tokens[this.#index];

        if (token.tokenType === tokenType) {
            this.#addNode(token);
            this.#index++;
        } else {
            const msg = `Unexpected '${token.tokenVal}' at line ${token.lineNo} ${errMsg}`;
            const err = new Error(msg);
            err.tokenIndex = this.#index;
            throw err;
        }
    }

    //-----------------------------------------------//
    //-------------- Recursive Descent --------------//
    //-----------------------------------------------//
    #addOp() {
        const tokenType = this.tokens[this.#index]?.tokenType;
        return tokenType && ["PLUS", "MINUS"].find((tT) => tT === tokenType);
    }

    #compOp() {
        const tokenType = this.tokens[this.#index]?.tokenType;
        return (
            tokenType &&
            ["LESSTHAN", "EQUAL", "MORETHAN"].find((tT) => tT === tokenType)
        );
    }

    #mulOp() {
        const tokenType = this.tokens[this.#index]?.tokenType;
        return tokenType && ["MULT", "DIV"].find((tT) => tT === tokenType);
    }

    #factor() {
        if (this.#index === this.tokens.length) {
            const lineNo = this.tokens[this.tokens.length - 1].lineNo;
            const msg = `Unexpected end of code at line ${lineNo} expected an expression`;
            const err = new Error(msg);
            err.tokenIndex = this.#index;
            throw err;
        }

        const token = this.tokens[this.#index];
        switch (token.tokenType) {
            case "OPENBRACKET":
                this.match("OPENBRACKET");
                this.#exp();
                this.match("CLOSEBRACKET", `expected ')'`);
                break;

            case "NUMBER":
                this.match("NUMBER");
                break;

            case "ID":
                this.match("ID");
                break;

            default:
                const msg = `Unexpected '${token.tokenVal}' at line ${token.lineNo} expected an expression`;
                const err = new Error(msg);
                err.tokenIndex = this.#index;
                throw err;
        }
    }

    #term() {
        this.#factor();

        while (this.#mulOp()) {
            this.match(this.#mulOp());
            this.#factor();
        }
    }

    #simpleExp() {
        this.#term();

        while (this.#addOp()) {
            this.match(this.#addOp());
            this.#term();
        }
    }

    #exp() {
        this.#simpleExp();

        const compOp = this.#compOp();
        if (compOp) {
            this.match(compOp);
            this.#simpleExp();
        }
    }

    #assignStmt() {
        this.match("ID");
        this.match("ASSIGN", `expected ':='`);
        this.#exp();
    }

    #readStmt() {
        this.match("READ");
        this.match("ID", `expected an identifier`);
    }

    #writeStmt() {
        this.match("WRITE");
        this.#exp();
    }

    #repeatStmt() {
        this.match("REPEAT");
        this.#stmtSeq();
        this.match("UNTIL", `expected 'until'`);
        this.#exp();
    }

    #ifStmt() {
        this.match("IF");
        this.#exp();
        this.match("THEN", `expected 'then'`);
        this.#stmtSeq();

        const tokenType = this.tokens[this.#index]?.tokenType;
        if (tokenType === "ELSE") {
            this.match("ELSE");
            this.#stmtSeq();
        }

        this.match("END", `expected ';' or 'end'`);
    }

    #statement() {
        if (this.#index === this.tokens.length) {
            const token = this.tokens[this.#index - 1];
            let msg;
            if (["REPEAT", "THEN", "ELSE"].includes(token.tokenType)) {
                msg = `Unexpected end of code at line ${token.lineNo} expected a statement`;
            } else {
                msg = `Extra semicolon found at line ${token.lineNo}`;
            }

            const err = new Error(msg);
            err.tokenIndex = this.#index - 1;
            throw err;
        }

        const token = this.tokens[this.#index];
        switch (token.tokenType) {
            case "IF":
                this.#ifStmt();
                break;

            case "REPEAT":
                this.#repeatStmt();
                break;

            case "READ":
                this.#readStmt();
                break;

            case "WRITE":
                this.#writeStmt();
                break;

            case "ID":
                this.#assignStmt();
                break;

            default:
                const msg = `Unexpected '${token.tokenVal}' at line ${token.lineNo}`;
                const err = new Error(msg);
                err.tokenIndex = this.#index;
                throw err;
        }
    }

    #stmtSeq() {
        this.#statement();

        while (this.tokens[this.#index]?.tokenType === "SEMICOLON") {
            this.match("SEMICOLON", `expected ';'`);
            this.#statement();
        }
    }

    parse() {
        try {
            if (this.tokens.length) {
                this.#stmtSeq();
                if (this.#index < this.tokens.length) {
                    const token = this.tokens[this.#index];
                    const msg = `Unexpected '${token.tokenVal}' at line ${token.lineNo} expected ';'`;
                    const err = new Error(msg);
                    err.tokenIndex = this.#index;
                    throw err;
                }
            }
            return { sucess: true, root: this.#root };
        } catch (error) {
            const msg = error.message;
            const tokenIndex = error.tokenIndex;
            return { sucess: false, error: { msg, tokenIndex } };
        }
    }

    //------------------------------------------------//
    //--------------- Build parse tree ---------------//
    //------------------------------------------------//

    /**
     * Create node from token
     * @param {Token} token - Token name
     * @param {Token?} idToken - Id token for read and assign nodes
     * @returns {TreeNode}
     */
    #createNode(token, idToken = null) {
        switch (token.tokenType) {
            case "IF":
            case "REPEAT":
            case "WRITE":
                return new TreeNode(token.tokenVal);

            case "NUMBER":
                return new TreeNode("const", token.tokenVal);

            case "PLUS":
            case "MINUS":
            case "MULT":
            case "DIV":
            case "LESSTHAN":
            case "MORETHAN":
            case "EQUAL":
                return new TreeNode("op", token.tokenVal);

            case "ID":
                return new TreeNode("id", token.tokenVal);

            case "READ":
            case "ASSIGN":
                return new TreeNode(
                    token.tokenType.toLowerCase(),
                    idToken?.tokenVal
                );

            case "OPENBRACKET":
            case "CLOSEBRACKET":
                return new TreeNode("bracket", token.tokenVal);
        }
    }

    /**
     * Check if token is operator
     * @param {Token} token
     * @returns {Boolean}
     */
    #isOp(token) {
        const op = [
            "PLUS",
            "MINUS",
            "MULT",
            "DIV",
            "LESSTHAN",
            "MORETHAN",
            "EQUAL",
            "CLOSEBRACKET",
        ];

        return op.includes(token?.tokenType);
    }

    /**
     *
     * @param {[TreeNode]} nodes
     */
    #evaluate(nodes) {
        let i = 0;

        let openBracket = 0;
        let closeBracket = 0;

        while (i < nodes.length && nodes.length > 1) {
            const node = nodes[i];
            const op = node.idName.substring(1, 2);
            if (op === "(") {
                openBracket = i;
                closeBracket = nodes.lastIndexOf(")");
                const slice = nodes.slice(openBracket + 1, closeBracket);
                const newNode = this.#evaluate(slice);
                console.log(slice);
                nodes.splice(openBracket, closeBracket + 1, newNode);
                console.log(nodes);
            } else i += 2;
        }

        i = 1;

        //Evaluate multiplications
        while (i < nodes.length && nodes.length > 1) {
            const node = nodes[i];
            const op = node.idName.substring(1, 2);

            if (op === "*" || op === "/") {
                node.addChildren([nodes[i - 1], nodes[i + 1]]);
                nodes.splice(i - 1, 3, node);
            } else i += 2;
        }

        i = 1;

        //Evaluate additions
        while (i < nodes.length && nodes.length > 1) {
            const node = nodes[i];
            const op = node.idName.substring(1, 2);

            if (op === "+" || op === "-") {
                node.addChildren([nodes[i - 1], nodes[i + 1]]);
                nodes.splice(i - 1, 3, node);
            } else i += 2;
        }

        i = 1;

        //Evaluate comparisons
        while (i < nodes.length && nodes.length > 1) {
            const node = nodes[i];
            const op = node.idName.substring(1, 2);

            if (op === "<" || op === ">" || op === "=") {
                node.addChildren([nodes[i - 1], nodes[i + 1]]);
                nodes.splice(i - 1, 3, node);
            } else i += 2;
        }

        return nodes[0];
    }

    #handleOp() {
        const nodes = this.#operations.map((token) => this.#createNode(token));
        const node = this.#evaluate(nodes);
        this.#lastNode.addChildren([node]);
        this.#operations = [];
    }

    /**
     * Add token to parse tree
     * @param {Token} token
     */
    #addNode(token) {
        let node;
        const nextToken = this.tokens[this.#index + 1];

        if (this.#isOp(token)) {
            this.#operations.push(this.tokens[this.#index - 1], token);
            if (token.tokenType === "CLOSEBRACKET" && !this.#isOp(nextToken)) {
                this.#handleOp();
            }
        } else {
            switch (token.tokenType) {
                case "OPENBRACKET":
                    this.#operations.push(token);
                    break;

                case "ID":
                case "NUMBER":
                    if (
                        !this.#isOp(nextToken) &&
                        nextToken?.tokenType !== "ASSIGN" &&
                        nextToken?.tokenType !== "CLOSEBRACKET"
                    ) {
                        node = this.#createNode(token);
                        if (this.#lastNode.name != "read") {
                            this.#operations.push(token);
                            this.#handleOp();
                            // this.#lastNode.addChildren([node]);
                        } else this.#lastNode.setIdName(token.tokenVal);
                    }
                    break;

                case "UNTIL":
                case "END":
                case "ELSE":
                    this.#stmtStack.pop();
                case "THEN":
                    this.#lastNode = this.#stmtStack.at(-1);
                    break;

                case "SEMICOLON":
                    this.#sibling = true;
                    this.#lastNode = this.#stmtStack.pop();
                    break;

                case "ASSIGN":
                    const idToken = this.tokens[this.#index - 1];
                    node = this.#createNode(token, idToken);
                    this.#stmtStack.push(node);
                    if (this.#sibling) {
                        this.#lastNode.next = node;
                        this.#sibling = false;
                    } else if (this.#lastNode) {
                        this.#lastNode.addChildren([node]);
                    }
                    this.#lastNode = node;
                    break;

                case "READ":
                case "WRITE":
                case "REPEAT":
                case "IF":
                    node = this.#createNode(token);
                    this.#stmtStack.push(node);
                    if (this.#sibling) {
                        this.#lastNode.next = node;
                        this.#sibling = false;
                    } else if (this.#lastNode) {
                        this.#lastNode.addChildren([node]);
                    }
                    this.#lastNode = node;
                    break;
            }
        }

        if (this.#root === null) this.#root = this.#lastNode;
    }
}

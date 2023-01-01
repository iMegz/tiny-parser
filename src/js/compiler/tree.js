class TreeNode {
    /**@type {TreeNode} - Parent*/
    parent = null;

    /**@type {TreeNode} - Next node */
    next = null;

    /**@type {[TreeNode]} - Array of children nodes of this node */
    children = [];

    /**@type {String} - Text on the node*/
    name = null;

    /**@type {String?} - Name of identifier used by the token in (read or assign)*/
    idName = null;

    /**@type {Boolean} - Whether node is terminal or not*/
    terminal = false;

    /**
     * Node name and idName (if exists)
     * @param {String} tokenName
     * @param {String?} idName
     */
    constructor(tokenName, idName = null) {
        this.name = tokenName;
        if (idName) this.idName = `(${idName})`;
        if (["id", "const", "op"].includes(tokenName)) {
            this.terminal = true;
        }
    }

    /**
     * Set next node (statement)
     * @param {TreeNode} next
     * @returns {TreeNode}
     */
    setNext(next) {
        this.next = next;
        return this;
    }

    /**
     * Add children to current node
     * @param {[TreeNode]} children
     * @returns {TreeNode}
     */
    addChildren(children) {
        children.forEach((child) => child.setParent(this));
        this.children.push(...children);
        return this;
    }

    /**
     * Set the parent of a node
     * @param {TreeNode} parent
     */
    setParent(parent) {
        this.parent = parent;
        return this;
    }

    /**
     * Set whether the node is terminal or not
     * @param {Boolean} isTerminal
     */
    setTerminal(isTerminal = true) {
        this.terminal = isTerminal;
    }

    /**
     * Set id name
     * @param {String} idName
     */
    setIdName(idName) {
        idName = this.idName = idName;
    }
}

class ParseTreeGraph {
    //Props
    #mx = 10;
    #my = 10;
    #width = 96;
    #height = 64;
    #gapX = 200;
    #gapY = 200;
    #elbowLinks = false;
    #childNearParent = true;
    #coloredStmts = true;
    #colors = [
        "#8d409e",
        "#41bd14",
        "#91793a",
        "#00ad99",
        "#ce4745",
        "#f98817",
        "#0a7228",
        "#2133ec",
        "#728965",
        "#bd0878",
    ];

    #colorIndex = 0;

    /**@type {d3.Selection<SVGSVGElement>} */
    #svg;

    /**@type {d3.Selection<SVGSVGElement>} */
    #nodes;

    /**@type {d3.Selection<SVGSVGElement>} */
    #links;

    #nx = 1; // Maximum number of horizontal nodes (tree width)
    #ny = 1; // Maximum number of vertical nodes (tree height)
    #cx = [0]; // Current widths for each high (ex: x[0] is width of level 0)

    isDrawn = false; // If the graph is drawn, redraw it if props changed

    /**
     * Initialize a parse tree
     * @param {String} container - HTML node containing the parse tree
     * @param {Props?} props - Parse tree properties
     */
    constructor(container, props) {
        const containerDiv = d3.select(container);
        containerDiv.node().innerHTML = ""; //Clear div content
        this.#svg = containerDiv.append("svg").attr("id", "pst-svg");
        this.#nodes = this.#svg.append("g").attr("id", "nodes");
        this.#links = this.#svg.append("g").attr("id", "links");
        this.setProps(props);
    }

    /**
     * Modify graph props
     * @param {Props} props
     */
    setProps(props) {
        const {
            mx,
            my,
            width,
            height,
            gapX,
            gapY,
            elbowLinks,
            childNearParent,
            coloredStmts,
        } = props || {};
        if (mx) this.#mx = mx;
        if (my) this.#my = my;
        if (width) this.#width = width;
        if (height) this.#height = height;
        if (gapX) this.#gapX = gapX;
        if (gapY) this.#gapY = gapY;
        if (elbowLinks) this.#elbowLinks = elbowLinks;
        if (childNearParent) this.#childNearParent = childNearParent;
        if (coloredStmts) this.#coloredStmts = coloredStmts;

        if (this.isDrawn) this.#draw();
    }

    /**
     * Calculate viewbox
     * @param {Number} nx - Maximum number in one level
     * @param {Number} ny - Graph height
     */
    getViewBox() {
        // const vbx = this.#nx * this.#width + ((this.#nx - 1) * this.#gapX) / 2 + 2 * this.#mx;
        // const vby = this.#height + (this.#ny - 1) * this.#gapY + 2 * this.#my;
        const vbx = 2 * this.#mx + (this.#nx - 1) * this.#gapX + this.#width;
        const vby = 2 * this.#my + (this.#ny - 1) * this.#gapY + this.#height;

        return { vbx, vby };
    }

    /**
     * Draw node
     * @param {Number} x - Zero indexed number in x-axix
     * @param {Number} y - Zero indexed number in y-axix
     * @param {TreeNode} node - Tree node
     * @param {String} color - Node color
     */
    #drawNode(x, y, node, color) {
        const { name, idName, terminal } = node;

        const g = this.#nodes.append("g");

        //Draw node rectangle
        const rect = g
            .append("rect")
            .attr("x", this.#mx + x * this.#gapX)
            .attr("y", this.#my + y * this.#gapY)
            .attr("width", this.#width)
            .attr("height", this.#height)
            .attr("stroke", color)
            .attr("fill", "none");

        if (terminal) rect.attr("rx", 50).attr("ry", 50);

        //Place node text

        const LINE_HEIGHT = 12.8; //Line hight of text of 16px font size
        const FONT_SIZE = 16;
        const rows = this.#height / LINE_HEIGHT; //Number of available rows

        //Test positioning
        const center = (rows * LINE_HEIGHT) / 2 - LINE_HEIGHT / 2;
        const r1 = (rows * LINE_HEIGHT) / 3 - LINE_HEIGHT / 2;
        const r2 = r1 + LINE_HEIGHT + 2;

        const text = g
            .append("text")
            .attr("x", this.#mx + this.#width / 2 + x * this.#gapX)
            .attr("y", this.#my + 10 + y * this.#gapY)
            .attr("font-size", FONT_SIZE)
            .attr("style", "user-select: none;")
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "middle");

        text.append("tspan")
            .text(name)
            .attr("x", this.#mx + this.#width / 2 + x * this.#gapX)
            .attr("y", this.#my + 10 + y * this.#gapY)
            .attr("dy", idName ? r1 : center); //Place in center if no idName

        if (idName)
            text.append("tspan")
                .text(idName)
                .attr("x", this.#mx + this.#width / 2 + x * this.#gapX)
                .attr("y", this.#my + 10 + y * this.#gapY)
                .attr("dy", r2);
    }

    /**
     * Draw link between two nodes
     * @param {Number} x1 - x coordinate for start node
     * @param {Number} y1 - y coordinate for start node
     * @param {Number} x2 - x coordinate for end node
     * @param {Number} y2 - y coordinate for end node
     * @param {String} color - Hex code for a color
     */
    #drawLink(x1, y1, x2, y2, color) {
        x1 = this.#mx + x1 * this.#gapX;
        x2 = this.#mx + x2 * this.#gapX;
        y1 = this.#my + y1 * this.#gapY;
        y2 = this.#my + y2 * this.#gapY;

        let path;

        if (x1 === x2) {
            x1 += 0.5 * this.#width;
            y1 += this.#height;

            path = `M ${x1} ${y1} V ${y2}`;
        } else if (y1 === y2) {
            x1 += this.#width;
            y1 += 0.5 * this.#height;

            path = `M ${x1} ${y1} H ${x2}`;
        } else {
            x1 += 0.5 * this.#width;
            y1 += this.#height;
            x2 += 0.5 * this.#width;

            if (this.#elbowLinks) {
                const gap = this.#gapY * 0.5 - this.#height * 0.5;
                path = `M ${x1} ${y1} v ${gap} H ${x2} v ${gap}`;
            } else path = `M ${x1} ${y1} L ${x2} ${y2}`;
        }
        this.#links.append("path").attr("d", path).attr("stroke", color);
    }

    /**
     * Draw nodes recursively
     * @param {TreeNode} node
     */
    #draw(node, y = 0, prevX, prevY, color) {
        if (this.#cx.length <= y) this.#cx.push(0);
        if (this.#ny <= y) this.#ny++;

        const x = this.#cx[y]++;

        if (!color) {
            if (this.#coloredStmts) {
                color = this.#colors[this.#colorIndex];
                this.#colorIndex = (this.#colorIndex + 1) % this.#colors.length;
            } else color = "#000000";
        }

        if (prevX !== undefined) {
            this.#drawLink(prevX, prevY, x, y, color);
        }
        this.#drawNode(x, y, node, color);

        const children = node.children;
        const size = children.length;
        if (size) {
            const after = this.#cx[y + 1];

            if (this.#childNearParent) {
                if (after && this.#cx[y] - after > 1) {
                    this.#cx[y + 1]++;
                } else if (!after && this.#cx[y] > 2) {
                    this.#cx.push(this.#cx[y] - 2);
                }
            }
            children.forEach((n) => this.#draw(n, y + 1, x, y, color));

            if (this.#childNearParent && size > 1) {
                //&&after &&after > this.#cx[y]
                if (!after) this.#cx[y] += size - 1;
                else if (after > this.#cx[y]) this.#cx[y] = this.#cx[y];
            }
        }

        const current = x + 1;
        const before = this.#cx[y - 1];
        const after = this.#cx[y + 1];

        if (before && current - before > 1) {
            this.#cx[y - 1] = current;
        } else if (after && current - after > 1) {
            this.#cx[y + 1] = current;
        }

        if (node.next) this.#draw(node.next, y, x, y);
    }

    /**
     *
     * @param {TreeNode} root
     */
    drawParseTree(root) {
        this.#draw(root);
        this.#nx = Math.max(...this.#cx);
        const { vbx, vby } = this.getViewBox();
        this.#svg.attr("viewBox", `0 0 ${vbx} ${vby}`);
        this.isDrawn = true;
    }
}

/**
 * @typedef {Object} Props
 * @property {Number} mx - Horizontal margin
 * @property {Number} my - Vertical margin
 * @property {Number} width - Box width
 * @property {Number} height - Box heigt
 * @property {Number} gapX - Horizonal gap
 * @property {Number} gapY - Vertical gap
 * @property {Number} fontSize - Text font size
 * @property {Boolean} elbowLinks - Use elbow links
 * @property {Boolean} childNearParent - Keep children near parents
 * @property {Boolean} coloredStmts - Colored statments
 */

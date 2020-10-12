var Canvas = OZ.Class();

Canvas.prototype.init = function(width, height) {
	this._elm = OZ.DOM.elm("canvas", {width:width, height:height});
	this._ctx = this._elm.getContext("2d");
	this._width = width;
	this._height = height;
	this._data = this._ctx.createImageData(this._width, this._height);
}

Canvas.prototype.setPixel = function(x, y, color) {
	var index = 4*(y*this._width + x);
	this._data.data[index] = color[0];
	this._data.data[index+1] = color[1];
	this._data.data[index+2] = color[2];
	this._data.data[index+3] = 255;
}

Canvas.prototype.getElement = function() {
	return this._elm;
}

Canvas.prototype.getWidth = function() {
	return this._width;
}

Canvas.prototype.getHeight = function() {
	return this._height;
}

Canvas.prototype.line = function(x1, y1, x2, y2) {
	for (var i=x1;i<=x2;i++) {
		for (var j=y1;j<=y2;j++) {
			this.setPixel(i, j, [0, 0, 0]);
		}
	}
}

Canvas.prototype.clear = function() {
	this._ctx.clearRect(0, 0, this._width, this._height);
}

Canvas.prototype.draw = function() {
	this._ctx.putImageData(this._data, 0, 0);
}

Canvas.prototype.rectangle = function(x, y, w, h, color) {
	
	for (var i=x;i<x+w;i++) {
		for (var j=y;j<y+h;j++) {
			this.setPixel(i, j, color);
		}
	}
	
}

var Maze = OZ.Class();

Maze.prototype.init = function(container, options) {
	this._options = {
		width: 200,
		height: 150,
		cellWidth: 4,
		cellHeight: 4
	}
	
	for (var p in options) { this._options[p] = options[p]; }
	var o = this._options;
	
	var w = o.width*o.cellWidth + o.width + 1;
	var h = o.height*o.cellHeight + o.height + 1;
	this._canvas = new Canvas(w, h);
	OZ.DOM.clear(container);
	container.appendChild(this._canvas.getElement());

	this._data = [];
	for (var i=0;i<o.width;i++) {
		this._data.push([]);
		for (var j=0;j<o.height;j++) {
			this._data[i].push([0, 0, -1, -1]); /* right wall, bottom wall, prev x, prev y */
		}
	}
	
	this._draw();
	var path = this._findPath(0, 0, o.width-1, o.height-1);
	for (var i=1;i<path.length;i++) {
		this._drawCell(path[i-1], path[i]);
	}
	
	this._canvas.draw();

}

Maze.prototype._drawCell = function(cell1, cell2) {
	var o = this._options;
	var x = Math.min(cell1[0], cell2[0]);
	var y = Math.min(cell1[1], cell2[1]);
	var w = (cell1[1] == cell2[1] ? 2*o.cellWidth+1 : o.cellWidth);
	var h = (cell1[0] == cell2[0] ? 2*o.cellHeight+1 : o.cellHeight);
	this._canvas.rectangle(
		1+x*(o.cellWidth+1), 1+y*(o.cellHeight+1), w, h,
		[255, 0, 0]
	);
}


Maze.prototype._findPath = function(x1, y1, x2, y2) {
	var result = [];
	var dirs = [
		[0,1], [0,-1], [1,0], [-1,0]
	];
	
	var stack = [[x1, y1]];
	this._data[x1][y1][2] = x1;
	this._data[x1][y1][3] = y1;
	
	while (stack.length) {
		var current = stack.shift();
		if (current[0] == x2 && current[1] == y2) {	break; }
		for (var i=0;i<dirs.length;i++) {
			var neighbor = this._getNeighbor(current, dirs[i]);
			if (!neighbor) { continue; }
			var data = this._data[neighbor[0]][neighbor[1]];
			if (data[2] != -1) { continue; } /* already visited */
			data[2] = current[0];
			data[3] = current[1];
			stack.push(neighbor);
		}
	}
	
	var x = x2;
	var y = y2;
	var data = null;
	while (x != x1 || y != y1) {
		result.push([x, y]);
		data = this._data[x][y];
		x = data[2];
		y = data[3];
	};
	result.push([x1, y1]);
	
	return result;
}

Maze.prototype._getNeighbor = function(coords, dir) {
	var o = this._options;
	var x1 = coords[0];
	var y1 = coords[1];
	var x2 = x1 + dir[0];
	var y2 = y1 + dir[1];
	
	if (x2 < 0 || y2 < 0 || x2 >= o.width || y2 >= o.height) { return false; }
	var data = this._data[x1][y1];
	var ndata = this._data[x2][y2];
	
	if (x1 < x2 && data[0]) { return false; }
	if (y1 < y2 && data[1]) { return false; }
	if (x1 > x2 && ndata[0]) { return false; }
	if (y1 > y2 && ndata[1]) { return false; }
	
	return [x2,y2];
}


Maze.prototype._draw = function(id, danger) {
	var rand = /* w/(w+h); */ 9/24;
	var o = this._options;
	
	var L = [];
	var R = [];
	
	for (var i=0;i<o.width;i++) {
		L.push(i);
		R.push(i);
	}
	L.push(o.width-1); /* fake stop-block at the right side */
	
	/* top + left + bottom lines */
	var w = this._canvas.getWidth();
	var h = this._canvas.getHeight();
	this._canvas.line(0, 0, w-1, 0); /* top */
	this._canvas.line(0, h-1, w-1, h-1); /* bottom */
	this._canvas.line(0, 0, 0, h-1); /* left */

	for (var j=0;j+1<o.height;j++) {
		/* one row */
		for (var i=0;i<o.width;i++) {
			
			/* right connection */
			if (i != L[i+1] && Math.random() > rand) {
				this._addToList(i, L, R);
			} else {
				/* right wall */
				var x = (i+1)*(o.cellWidth+1);
				var y1 = j*(o.cellHeight+1);
				var y2 = y1 + o.cellHeight + 1;
				this._canvas.line(x, y1, x, y2);
				this._data[i][j][0] = 1;
			}
			
			/* bottom connection */
			if (i != L[i] && Math.random() > rand) {
				/* remove connection */
				this._removeFromList(i, L, R);

				/* bottom wall */
				var y = (j+1)*(o.cellHeight+1);
				var x1 = i*(o.cellWidth+1);
				var x2 = x1 + o.cellWidth + 1;
				this._canvas.line(x1, y, x2, y);
				this._data[i][j][1] = 1;
			}
		}
	}

	/* last row */
	for (var i=0;i<o.width;i++) {
		
		/* right connection */
		if (i != L[i+1] && (i == L[i] || Math.random() > rand)) {
			/* dig right also if the cell is separated, so it gets connected to the rest of maze */
			this._addToList(i, L, R);
		} else {
			/* right wall */
			var x = (i+1)*(o.cellWidth+1);
			var y1 = j*(o.cellHeight+1);
			var y2 = y1 + o.cellHeight + 1;
			this._canvas.line(x, y1, x, y2);
			this._data[i][j][0] = 1;
		}

		this._removeFromList(i, L, R);
	}
	
}

/**
 * Remove "i" from its list
 */
Maze.prototype._removeFromList = function(i, L, R) {
	R[L[i]] = R[i];
	L[R[i]] = L[i];
	R[i] = i;
	L[i] = i;
}

/**
 * Join lists with "i" and "i+1"
 */
Maze.prototype._addToList = function(i, L, R) {
	R[L[i+1]] = R[i];
	L[R[i]] = L[i+1];
	R[i] = i+1;
	L[i+1] = i;
}


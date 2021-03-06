
var drop_canvas = document.getElementById('drop-canvas');
var norm_canvas = document.getElementById('norm-canvas');
var eq_canvas = document.getElementById('eq-canvas');

var drop_context = drop_canvas.getContext('2d');
var norm_context = norm_canvas.getContext('2d');
var eq_context = eq_canvas.getContext('2d');

drop_canvas.ondragover = function() {

    this.className = 'hover';
    return false;

};

drop_canvas.ondragend = function() {

    this.className = '';
    return false;

};

drop_canvas.ondrop = function(e) {

    this.className = '';

    e.preventDefault;

    var file = e.dataTransfer.files[0];
    var reader = new FileReader();

    reader.onload = function(event) {

	var image = new Image();
	image.src = event.target.result;

	clear();

	image.onload = function() {
	
	    drop_canvas.width = norm_canvas.width = eq_canvas.width = this.width;
	    drop_canvas.height = norm_canvas.height = eq_canvas.height = this.height;

	    drop_context.drawImage(this, 0, 0, this.width, this.height);
	    norm_context.drawImage(this, 0, 0, this.width, this.height);                                                                        
	    eq_context.drawImage(this, 0, 0, this.width, this.height); 
	    
	    image_loaded(this);

	};

    };

    reader.readAsDataURL(file);

    return false;

};

var draw_histogram = function(data, id, cumulative) {

    var margin = {top: 5, right: 10, bottom: 30, left: 10};
    var svg = d3.select("svg"+id);

    var width = 300 - margin.left - margin.right;
    var height = 256 - margin.top - margin.bottom;

    var x = d3.scaleLinear().domain([0, 255]).range([0, width]);
    var h = d3.histogram().domain(x.domain()).thresholds(x.ticks(255))(data);

    var y = d3.scaleLinear().range([height, 0]);

    var area = d3.area()
    .curve(d3.curveStepAfter)
    .x(function(d, i) { return x(i); })
    .y0(y(0))
    .y1(y);
	
    var line = d3.line()
    .curve(d3.curveStepAfter)
    .x(function(d, i) { return x(i); })
    .y(y);

    var hist = svg.append("g")
    .attr("class", "histogram")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bins = [];
    var sum = 0;

    for ( var i = 0; i < h.length; i++ ) {

	if ( cumulative ) {
	    bins[i] = sum + h[i].length;
	    sum += h[i].length;
	} else {
	    bins[i] = h[i].length;
	}
    }

    y.domain([0, d3.max(bins)]);

    var hist_area = hist.selectAll(id + " > .histogram-area")
    .data([bins])
    .enter().append("path")
    .attr("class", "histogram-area");
    
    hist_area.attr("d", area);

    var hist_line = hist.selectAll(id + " > .histogram-line")
    .data([bins])
    .enter().append("path")
    .attr("class", "histogram-line");
    
    hist_line.attr("d", line);

    hist.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

};

var normalize = function(data) {

    // Lab color space: L runs from 0 - 100
    //var scale = d3.scaleLinear().domain([d3.min(data), d3.max(data)]).range([0, 100]);
    var scale = d3.scaleLinear().domain([d3.min(data), d3.max(data)]).range([0,255]);

    console.log('before normalization:', d3.min(data), d3.max(data));

    var normalized_data = [];

    for ( var i = 0; i < data.length; i++ ) {

	normalized_data[i] = scale(data[i]);

    }

    console.log('after normalization:', d3.min(normalized_data), d3.max(normalized_data));

    return normalized_data;

};

var equalize = function(data) {

    var x = d3.scaleLinear().domain([0, 255]);
    var hist = d3.histogram().domain(x.domain()).thresholds(x.ticks(255));
    var bins = hist(data);

    // Reminder: hist(data) returns the bins but the bins include
    // an array of the numbers found in each bin, length (which is bin height)
    // and x0 and x1, the values of the edges of the bin

    var c = [];
    var sum = 0

    for ( var i = 0; i < bins.length; i++ ) {

	c[i] = sum + bins[i].length;
	sum += bins[i].length;

    }

    var eq_data = [];

    for ( var j = 0; j < data.length; j++ ) {
	
	var br = 255*(c[data[j]]/data.length);

	if ( br > 255 || br < 0 )
	    console.log('!', br)

	eq_data[j] = br;

    }

    console.log(data.length, '==', c[255], '?');

    return eq_data;

};

var clear = function() {
    
    drop_context.clearRect(0, 0, drop_canvas.width, drop_canvas.height);
    norm_context.clearRect(0, 0, norm_canvas.width, norm_canvas.height);
    eq_context.clearRect(0, 0, eq_canvas.width, eq_canvas.height);

    d3.selectAll("svg").selectAll("*").remove();
    
};

var image_loaded = function(img) {

    var rgba = drop_context.getImageData(0, 0, img.width, img.height).data;

    var data = [];

    for ( var i = 0; i < rgba.length; i += 4 ) {

	//data.push(d3.lab(d3.rgb(rgba[i], rgba[i+1], rgba[i+2])).l);
	data.push(Math.round(rgba[i]*0.2126 + rgba[i+1]*0.7152 + rgba[i+2]*0.0722));

    }

    draw_histogram(data, "#drop-hist", false);
    draw_histogram(data, "#drop-cumulative", true);

    var norm = normalize(data);
    var norm_data = norm_context.getImageData(0, 0, img.width, img.height);
    var norm_scale = d3.scaleLinear().domain(d3.extent(norm)).range(['#000', '#fff']);

    for ( var j = 0; j < norm.length; j++ ) {

        var color = d3.rgb(norm_scale(norm[j]));

	norm_data.data[j*4] = color.r;
        norm_data.data[j*4 + 1] = color.g;
        norm_data.data[j*4 + 2] = color.b;
        norm_data.data[j*4 + 3] = 255;

    }

    draw_histogram(norm, "#norm-hist", false);
    draw_histogram(norm, "#norm-cumulative", true);

    norm_context.putImageData(norm_data, 0, 0);

    var eq = equalize(data);
    var eq_data = eq_context.getImageData(0, 0, img.width, img.height);
    var eq_scale = d3.scaleLinear().domain(d3.extent(eq)).range(['#000', '#fff']);

    for ( var k = 0; k < eq.length; k++ ) {

        var color = d3.rgb(eq_scale(eq[k]));

        eq_data.data[k*4] = color.r;
        eq_data.data[k*4 + 1] = color.g;
        eq_data.data[k*4 + 2] = color.b;
        eq_data.data[k*4 + 3] = 255;

    }

    draw_histogram(eq, "#eq-hist", false);
    draw_histogram(eq, "#eq-cumulative", true);

    eq_context.putImageData(eq_data, 0, 0);
   
};

var load_image = function(file_name) {

    var image = new Image();
    image.src = file_name;

    clear();

    image.onload = function() {

	drop_canvas.width = norm_canvas.width = eq_canvas.width = this.width;
	drop_canvas.height = norm_canvas.height = eq_canvas.height = this.height;
    
	drop_context.drawImage(this, 0, 0, this.width, this.height);
	norm_context.drawImage(this, 0, 0, this.width, this.height);
	eq_context.drawImage(this, 0, 0, this.width, this.height);

	image_loaded(this);

    };

};


load_image('./images/MFDC0007.jpg');

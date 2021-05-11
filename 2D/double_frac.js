var locX = 0.0;
var locY = 0.0;
// locX = 1.6861733;
// locY = 0.0;

var scale = 0.315;
//      0000006.866455078124999e-7
// scale = 0.0000006866;
var canvas = document.querySelector('#glcanvas');
var mouseDown = false;
var mouseX = 0, mouseY = 0;

main();

//
// Start here
//
function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program

  const vsSource = `
    precision highp float;
    
    attribute vec4 aVertexPosition;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform vec2 uCenter;
    uniform float uScale;

    varying vec4 pos;
    varying vec2 center;
    varying float scale;
    
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      pos = gl_Position;
      center = uCenter;
      scale = uScale;
    }
  `;

  // Fragment shader program

  const fsSource = `
    precision highp float;

    varying vec2 center;
    varying float scale;
    varying vec4 pos;

    // Double emulation based on GLSL Mandelbrot Shader by Henry Thasler (www.thasler.org/blog)
	//
	// Emulation based on Fortran-90 double-single package. See http://crd.lbl.gov/~dhbailey/mpdist/
	// Substract: res = ds_add(a, b) => res = a + b
    float times_frc(float a, float b) {
        return mix(0.0, a * b, b != 0.0 ? 1.0 : 0.0);
    }

    float plus_frc(float a, float b) {
        return mix(a, a + b, b != 0.0 ? 1.0 : 0.0);
    }

    float minus_frc(float a, float b) {
        return mix(a, a - b, b != 0.0 ? 1.0 : 0.0);
    }

    // Double emulation based on GLSL Mandelbrot Shader by Henry Thasler (www.thasler.org/blog)
    //
    // Emulation based on Fortran-90 double-single package. See http://crd.lbl.gov/~dhbailey/mpdist/
    // Substract: res = ds_add(a, b) => res = a + b
    vec2 add (vec2 dsa, vec2 dsb) {
        vec2 dsc;
        float t1, t2, e;

        t1 = plus_frc(dsa.x, dsb.x);
        e = minus_frc(t1, dsa.x);
        t2 = plus_frc(plus_frc(plus_frc(minus_frc(dsb.x, e), minus_frc(dsa.x, minus_frc(t1, e))), dsa.y), dsb.y);
        dsc.x = plus_frc(t1, t2);
        dsc.y = minus_frc(t2, minus_frc(dsc.x, t1));
        return dsc;
    }

    // Substract: res = ds_sub(a, b) => res = a - b
    vec2 sub (vec2 dsa, vec2 dsb) {
        vec2 dsc;
        float e, t1, t2;

        t1 = minus_frc(dsa.x, dsb.x);
        e = minus_frc(t1, dsa.x);
        t2 = minus_frc(plus_frc(plus_frc(minus_frc(minus_frc(0.0, dsb.x), e), minus_frc(dsa.x, minus_frc(t1, e))), dsa.y), dsb.y);

        dsc.x = plus_frc(t1, t2);
        dsc.y = minus_frc(t2, minus_frc(dsc.x, t1));
        return dsc;
    }

    // Compare: res = -1 if a < b
    //              = 0 if a == b
    //              = 1 if a > b
    float cmp(vec2 dsa, vec2 dsb) {
        if (dsa.x < dsb.x) {
            return -1.;
        }
        if (dsa.x > dsb.x) {
            return 1.;
        }
        if (dsa.y < dsb.y) {
            return -1.;
        }
        if (dsa.y > dsb.y) {
            return 1.;
        }
        return 0.;
    }

    // Multiply: res = ds_mul(a, b) => res = a * b
    vec2 mul (vec2 dsa, vec2 dsb) {
        vec2 dsc;
        float c11, c21, c2, e, t1, t2;
        float a1, a2, b1, b2, cona, conb, split = 8193.;

        cona = times_frc(dsa.x, split);
        conb = times_frc(dsb.x, split);
        a1 = minus_frc(cona, minus_frc(cona, dsa.x));
        b1 = minus_frc(conb, minus_frc(conb, dsb.x));
        a2 = minus_frc(dsa.x, a1);
        b2 = minus_frc(dsb.x, b1);

        c11 = times_frc(dsa.x, dsb.x);
        c21 = plus_frc(times_frc(a2, b2), plus_frc(times_frc(a2, b1), plus_frc(times_frc(a1, b2), minus_frc(times_frc(a1, b1), c11))));

        c2 = plus_frc(times_frc(dsa.x, dsb.y), times_frc(dsa.y, dsb.x));

        t1 = plus_frc(c11, c2);
        e = minus_frc(t1, c11);
        t2 = plus_frc(plus_frc(times_frc(dsa.y, dsb.y), plus_frc(minus_frc(c2, e), minus_frc(c11, minus_frc(t1, e)))), c21);

        dsc.x = plus_frc(t1, t2);
        dsc.y = minus_frc(t2, minus_frc(dsc.x, t1));

        return dsc;
    }

    // create double-single number from float
    vec2 set(float a) {
        return vec2(a, 0.0);
    }

    float rand(vec2 co) {
        // implementation found at: lumina.sourceforge.net/Tutorials/Noise.html
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    vec2 complexMul(vec2 a, vec2 b) {
        return vec2(a.x*b.x -  a.y*b.y,a.x*b.y + a.y * b.x);
    }

    // double complex multiplication
    vec4 dcMul(vec4 a, vec4 b) {
        return vec4(sub(mul(a.xy,b.xy),mul(a.zw,b.zw)),add(mul(a.xy,b.zw),mul(a.zw,b.xy)));
    }

    vec4 dcAdd(vec4 a, vec4 b) {
        return vec4(add(a.xy,b.xy),add(a.zw,b.zw));
    }

    // Length of double complex
    vec2 dcLength(vec4 a) {
        return add(mul(a.xy,a.xy),mul(a.zw,a.zw));
    }

    vec4 dcSet(vec2 a) {
        return vec4(a.x,0.,a.y,0.);
    }

    vec4 dcSet(vec2 a, vec2 ad) {
        return vec4(a.x, ad.x,a.y,ad.y);
    }

    // Multiply double-complex with double
    vec4 dcMul(vec4 a, vec2 b) {
        return vec4(mul(a.xy,b),mul(a.wz,b));
    }

	vec4 dcSub(vec4 a, vec4 b) {
		return vec4(sub(a.xy,b.xy),sub(a.zw,b.zw));
	}

    vec4 map_to_color(float t) {
      float r = 9.0 * (1.0 - t) * t * t * t;
      float g = 15.0 * (1.0 - t) * (1.0 - t) * t * t;
      float b = 8.5 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t;
  
      return vec4(r, g, b, 1.0);
    }

    float PI = 3.14159265358979323846264;

    float scaleF = 2.0;
    //known deep coord
    //-1.74995768370609350360221450607069970727110579726252077930242837820286008082972804887218672784431700831100544507655659531379747541999999995
    //0.00000000000000000278793706563379402178294753790944364927085054500163081379043930650189386849765202169477470552201325772332454726999999995
    // -1.401,155,189,098,919,8

    //Hmm this way of breaking up numbers isn't really right
    //Needs a string to double representation routine
    // vec4 offset = vec4(-1.749958,1e-6 - 6.837060935e-7, 2.787937e-18,0.65633794e-24);
    vec4 offset = vec4(0.0, 0.0, 0.0, 0.0);
    //vec4 offset = vec4(-1.4011551,8.90989198e-8, 0.0,0.0);

    const int max_iterations = 1500; //1500
    const int max_colors = 50;
    const float color_scale = 2.0;
    const float inverse_max_colors = 1.0 / float(max_colors);

    const int P = 2;
    const float threshold = 200000.0;


    #define cx_mul(a, b) vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x)

    vec4 color_ramp(int i) {
        // Running the index through cos creates a continous ramp.
        float normalized_mod = mod(float(i), float(max_colors)) * inverse_max_colors;
        float normalized_cos = (cos(normalized_mod * 2.0 * PI) + 1.0) * 0.5;
        i = int(float(max_colors) * normalized_cos);
    
        float factor = float(i) / float(max_colors);
        float inverse_factor = 1.0 - factor;
        // An arbritrary ramp of colors
        return vec4(sqrt(sqrt(factor)), factor, inverse_factor * 0.5, 1.0);
    }
    
    vec4 color_from_ramp(int i, float f) {
        vec4 first = color_ramp(i);
        vec4 second = color_ramp(i + 1);
        return first * (1.0 - f) + second * f;
    }

    vec4 color_from_iteration(vec4 z, int i) {
        // Continuous coloring
        vec2 len=dcLength(z);
        float s = float(i) + log2(log(threshold)) - log2(log(len.x+len.y));
        s *= color_scale;
        int first = int(floor(s));
        return color_from_ramp(first, s - float(first));
    }

    vec3 double_fractal(vec2 fragCoord) {
        vec2 Threshold = set(threshold);
        float iTime = 1.0;
        vec2 iResolution = vec2(1280, 960);

        vec4 c = vec4(
            set((fragCoord.x / iResolution.x) * 3.5*scale - center.x),
            set((fragCoord.y / iResolution.y) * 2.0*scale - center.y)
        );

        c = dcSub(dcAdd(c,offset),vec4(set(2.5*scale),set(scale)));

        vec4 z = vec4(0.0, 0.0, 0.0, 0.0);
        int final_i;
        for (int i = 0; i < max_iterations; i++) {
            final_i = i;

            if (cmp(dcLength(z), Threshold)>0.) { break; } 

            // z^P + c, P = 2  gives us  z^2 + c
            z = dcAdd(dcMul(z, z), c);
        }

        return color_from_iteration(z, final_i).xyz;
    }

    void main() {
        vec2 iResolution = vec2(1280, 960);
        vec2 pixelPos = pos.xy * iResolution;

        gl_FragColor.xyz  = double_fractal( pixelPos + vec2(0,0) );
        // gl_FragColor.xyz += double_fractal( pixelPos + vec2(.5,.0) );
        // gl_FragColor.xyz += double_fractal( pixelPos + vec2(.0,.5) );
        // gl_FragColor.xyz += double_fractal( pixelPos + vec2(.5,.5) );
        // gl_FragColor.xyz /= 4.0;
        gl_FragColor.w = 1.0;
        // vec3 s1 = double_fractal(pos.xy + scale * vec2(0.5, 0.0));
        // vec3 s2 = double_fractal(pos.xy + scale * vec2(0.0, 0.5));
        // vec3 s3 = double_fractal(pos.xy + scale * vec2(0.5, 0.0));
        // vec3 s4 = double_fractal(pos.xy + scale * vec2(0.0, 0.5));
        // vec3 avg = (s1 + s2 + s3 + s4) / 4.0;
        // gl_FragColor = vec4(avg, 1.0);
        // gl_FragColor = vec4(double_fractal(pos.xy), 1.0);
    }
  `;

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aVertexColor and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      center: gl.getUniformLocation(shaderProgram, 'uCenter'),
      scale: gl.getUniformLocation(shaderProgram, 'uScale'),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl);
  var then = 0;
  // Draw the scene
  function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
        then = now;
        drawScene(gl, programInfo, buffers);
        requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers(gl) {

  // Create a buffer for the square's positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.

  const positions = [
     3.0,  3.0,
    -3.0,  3.0,
     3.0, -3.0,
    -3.0, -3.0,
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Now set up the colors for the vertices

  var colors = [
    1.0,  1.0,  1.0,  1.0,    // white
    1.0,  0.0,  0.0,  1.0,    // red
    0.0,  1.0,  0.0,  1.0,    // green
    0.0,  0.0,  1.0,  1.0,    // blue
  ];

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    color: colorBuffer,
  };
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
    // gl.disable(gl.DITHER);
    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                    fieldOfView,
                    aspect,
                    zNear,
                    zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(modelViewMatrix,     // destination matrix
                    modelViewMatrix,     // matrix to translate
                    [-0.0, 0.0, -6.0]);  // amount to translate
    
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL to use our program when drawing

    gl.useProgram(programInfo.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    gl.uniform2f(
        programInfo.uniformLocations.center,
        locX, locY);
    gl.uniform1f(
        programInfo.uniformLocations.scale,
        scale);

    {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

document.addEventListener("keydown", function(event) {
    var keyCode = event.which;
    if (keyCode == 90) {
        console.log("Zoom out : " + scale);
        scale /= 0.1;
        scale = scale > 1.25 ? 1.25 : scale;
    } else if (keyCode == 88) {
        console.log("Zoom in : " + scale);
        scale /= 2;
        scale = scale < 0.0 ? 0.0 : scale;
    }
}, false);

canvas.addEventListener('mousedown', function (evt) {
    evt.preventDefault();
    mouseDown = true;
    mouseX = evt.clientX;
    mouseY = evt.clientY;
}, false);

canvas.addEventListener('mousemove', function (evt) {            
    if (!mouseDown) {return} // is the button pressed?       

    evt.preventDefault();
    var deltaX = evt.clientX - mouseX,
        deltaY = evt.clientY - mouseY;
    mouseX = evt.clientX;
    mouseY = evt.clientY;
    dragAction(deltaX, deltaY);
}, false);

canvas.addEventListener('mouseup', function (evt) {
    evt.preventDefault();
    mouseDown = false;
}, false);

function dragAction(deltaX, deltaY) {
    locX -= deltaX/(100 * (1.0/scale));
    locY -= deltaY/(100 * (1.0/scale));
    console.log(locX + ", " + locY);
}

var lastKnownScrollPosition = 0;
var ticking = false;

window.addEventListener('scroll', function(e) {
    console.log("scrolling");
    // lastKnownScrollPosition = window.scrollY;
  
    // if (!ticking) {
    //   window.requestAnimationFrame(function() {
    //     doSomething(lastKnownScrollPosition);
    //     ticking = false;
    //   });
  
    //   ticking = true;
    // }
    // console.log(lastKnownScrollPosition);
});
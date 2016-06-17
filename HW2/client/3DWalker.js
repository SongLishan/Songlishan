// 顶点着色器程序
var TEXTURE_VSHADER_SOURCE =
	'attribute vec4 a_Position;\n' +
	'attribute vec4 a_Normal;\n' +
	'attribute vec2 a_TexCoord;\n' +
	'uniform mat4 u_ModelMatrix;\n' + // 模型矩阵
	'uniform mat4 u_MvpMatrix;\n' +
	'uniform mat4 u_NormalMatrix;\n' + // 用来变换法向量的矩阵
	'varying vec3 v_Normal;\n' +
	'varying vec3 v_pPosition;\n' +
	'varying vec4 v_Color;\n' +
	'varying vec2 v_TexCoord;\n' +
	'void main() {\n' +
	'  gl_Position = u_MvpMatrix * a_Position;\n' +
	'  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
	// 计算顶点的世界坐标
	'  v_pPosition = vec3(u_ModelMatrix * a_Position);\n' +
	'  v_TexCoord = a_TexCoord;\n' +
	'}\n';

// 片元着色器程序
var TEXTURE_FSHADER_SOURCE =
	'precision mediump float;\n' +
	'uniform sampler2D u_Sampler;\n' +
	'uniform vec3 u_AmbientLight;\n' + // 环境光颜色
	'uniform vec3 u_LightPosition;\n' + // 光源位置（世界坐标系）
	'uniform vec3 u_PointLightColor;\n' +
	'uniform vec3 u_LightDirection;\n' + // 归一化的世界坐标
	'varying vec3 v_Normal;\n' +
	'varying vec3 v_pPosition;\n' +
	'varying vec2 v_TexCoord;\n' +
	'uniform bool isPointLightOn;\n' +
	'void main() {\n' +
	'  vec4 color = texture2D(u_Sampler, v_TexCoord);\n' +
	// 对法向量进行归一化
	'  vec3 normal = normalize(v_Normal);\n' +
	// 计算光线方向和法向量的点积
	'  float nDotL = max(dot(normal, u_LightDirection), 0.0);\n' +
	'  vec3 diffuse = nDotL * color.rgb;\n' +
	'  vec3 ambient = u_AmbientLight * color.rgb;\n' +
	'  vec3 pointLightDirection = normalize(u_LightPosition - v_pPosition);\n' +
	'  float pnDotL = max(dot(pointLightDirection, normal), 0.0);\n' +
	'  vec3 pdiffuse = u_PointLightColor * pnDotL * color.rgb;\n' +
	'  vec3 lightColor = diffuse + ambient;\n' +
	'  if (isPointLightOn){\n' +
	'     lightColor += pdiffuse;\n' +
	'  }\n' +

	'  gl_FragColor = vec4(lightColor, color.a);\n' +
	'}\n';

// 顶点着色器程序
var LIGHT_VSHADER_SOURCE =
	'attribute vec4 a_Position;\n' +
	'attribute vec4 a_Color;\n' +
	'attribute vec4 a_Normal;\n' + // 法向量
	'uniform mat4 u_ModelMatrix;\n' + // 模型矩阵
	'uniform mat4 u_MvpMatrix;\n' +
	'uniform mat4 u_NormalMatrix;\n' + // 用来变换法向量的矩阵
	'varying vec3 v_Normal;\n' +
	'varying vec3 v_pPosition;\n' +
	'varying vec4 v_Color;\n' +
	'void main() {\n' +
	'  gl_Position = u_MvpMatrix * a_Position;\n' +
	// 对法向量进行归一化
	'  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
	'  v_pPosition = vec3(u_ModelMatrix * a_Position);\n' +
	'  v_Color = a_Color;\n' +
	'}\n';

// 片元着色器程序
var LIGHT_FSHADER_SOURCE =
	'precision mediump float;\n' +
	'uniform vec3 u_AmbientLight;\n' +
	'uniform vec3 u_LightPosition;\n' +
	'uniform vec3 u_PointLightColor;\n' +
	'uniform vec3 u_LightDirection;\n' + // 归一化的世界坐标
	'varying vec3 v_Normal;\n' +
	'varying vec3 v_pPosition;\n' +
	'varying vec4 v_Color;\n' +
	'uniform bool isPointLightOn;\n' +
	'void main() {\n' +
	// 对法向量进行归一化
	'  vec3 normal = normalize(v_Normal);\n' +
	// 计算光线方向和法向量的点积
	'  float nDotL = max(dot(normal, u_LightDirection), 0.0);\n' +
	// 计算漫反射光的颜色
	'  vec3 diffuse = v_Color.rgb * nDotL;\n' +
	// 计算环境光产生的反射光颜色
	'  vec3 ambient = u_AmbientLight * v_Color.rgb;\n' +
	// 将以上两者相加得到物体最终的颜色 
	'  vec3 pointLightDirection = normalize(u_LightPosition - v_pPosition);\n' +
	'  float pnDotL = max(dot(pointLightDirection, normal), 0.0);\n' +
	'  vec3 pdiffuse = u_PointLightColor * v_Color.rgb * pnDotL;\n' +
	'  vec3 lightColor = diffuse + ambient;\n' +
	'  if (isPointLightOn){\n' +
	'     lightColor += pdiffuse;\n' +
	'  }\n' +
	'  gl_FragColor = vec4(lightColor, v_Color.a);\n' +
	'}\n';

// 透视投影可视空间近裁剪面的宽高比
var cameraParaAspect;

var textureProgram;
var lightProgram;

var isTexUnit0 = false;
var isTexUnit1 = false;

//相机位置
var eye = new Vector3(CameraPara.eye);
var at = new Vector3(CameraPara.at);
var up = new Vector3(CameraPara.up);
var dir = VectorMinus(at, eye); // eye direction

var SceneObjectList = [];

var SceneObject = function() {
	this.model;
	this.filePath; 
	this.objDoc;
	this.drawingInfo;
	this.transform;
	this.valid = 0;
}

var textureObjectList = [];
var FLOORFLAG = 0;
var BOXFLAG = 1;

var TexObject = function() {
	this.model; //a model contains some vertex buffer
	this.texture; // texture
	this.drawingInfo;
};

var dbgmsg = "";

// 键盘事件开关
var isTransUp = false; // ↑
var isTransDown = false; // ↓
var isTransLeft = false; // ←
var isTransRight = false; // →
var isRotateLeft = false; // J
var isRotateRight = false; // K
var isPointLightOn = false; // 光源开关
var isAnimate = false; // 动画开关

function main() {

	// 获取<canvas>元素
	canvas = document.getElementById('webgl');

	// 计算透视投影可视空间近裁剪面的宽高比
	cameraParaAspect = canvas.width / canvas.height;

	// 获取WebGL绘图上下文
	gl = getWebGLContext(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// 初始化着色器
	textureProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);
	lightProgram = createProgram(gl, LIGHT_VSHADER_SOURCE, LIGHT_FSHADER_SOURCE);
	if (!textureProgram || !lightProgram) {
		console.log('Failed to intialize shaders.');
		return;
	}

	// 指定清空<canvas>的颜色
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	// Enable depth test
	gl.enable(gl.DEPTH_TEST);

	// 设置顶点信息
	initTextureProgram(gl);
	initLightProgram(gl);

	// 绑定键盘事件
	document.onkeydown = function(ev) {
		keydown(ev, gl);
	};
	document.onkeyup = function(ev) {
		keyup(ev, gl);
	};

	var tick = function() {
		cameraAnimate();
		drawAll(gl);
		requestAnimationFrame(tick, canvas); // 请求浏览器调用tick
	};
	tick();
}

// 绘制所有模型
function drawAll(gl) {

	var viewMatrix = new Matrix4(); // View matrix
	var projMatrix = new Matrix4(); // Projection matrix

	viewMatrix.setLookAt(eye.elements[0], eye.elements[1], eye.elements[2], at.elements[0], at.elements[1], at.elements[2], up.elements[0], up.elements[1], up.elements[2]);
	projMatrix.setPerspective(CameraPara.fov, cameraParaAspect, CameraPara.near, CameraPara.far);

	// 清空<canvas>
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var message = document.getElementById('messageBox');
	message.innerHTML = 
	'message: <br>' +
	'position: ' + (Math.round(eye.elements[0] * 100) / 100) + ', '+ (Math.round(eye.elements[1] * 100) / 100) + ', '+ (Math.round(eye.elements[2] * 100) / 100) + '<br>' +
	'look at: ' + (Math.round(at.elements[0] * 100) / 100) + ', '+ (Math.round(at.elements[1] * 100) / 100) + ', '+ (Math.round(at.elements[2] * 100) / 100);

	drawTextureModel(gl, textureProgram, viewMatrix, projMatrix);
	drawLightModel(gl, lightProgram, viewMatrix, projMatrix);
}

function drawTextureModel(gl, program, viewMatrix, projMatrix) {

	// Coordinate transformation matrix
	var modelMatrix = new Matrix4(); // Model matrix
	var mvpMatrix = new Matrix4(); // Model view projection matrix
	var normalMatrix = new Matrix4();

	gl.useProgram(program); // Tell that this program object is used

	// initialize the variable about light
	gl.uniform3f(program.u_LightDirection, sceneDirectionLight[0], sceneDirectionLight[1], sceneDirectionLight[2]);
	gl.uniform3f(program.u_AmbientLight, sceneAmbientLight[0], sceneAmbientLight[1], sceneAmbientLight[2]);
	gl.uniform3f(program.u_LightPosition, eye.elements[0], eye.elements[1], eye.elements[2]);
	gl.uniform3f(program.u_PointLightColor, scenePointLightColor[0], scenePointLightColor[1], scenePointLightColor[2]);

	// draw each TexObject 
	for (i = 0; i < textureObjectList.length; i++) {
		var to = textureObjectList[i];
		// initialize the infomation( texCoord, vertex, normal... )
		to.drawingInfo = readConfig(gl, to.model, i);
		if (to.drawingInfo) {
			// initialize the model matrix
			modelMatrix.setIdentity();
			modelMatrix.translate(to.drawingInfo.translate[0], to.drawingInfo.translate[1], to.drawingInfo.translate[2]);
			modelMatrix.scale(to.drawingInfo.scale[0], to.drawingInfo.scale[1], to.drawingInfo.scale[2]);

			gl.uniformMatrix4fv(program.u_ModelMatrix, false, modelMatrix.elements);

			mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
			gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);

			// initialize the normal Matrix
			normalMatrix.setInverseOf(modelMatrix);
			normalMatrix.transpose();
			gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements);

			// initialize all the attributes
			initAttributeVariable(gl, program.a_Position, to.model.vertexBuffer); // Vertex coordinates
			initAttributeVariable(gl, program.a_Normal, to.model.normalBuffer); // Normal
			initAttributeVariable(gl, program.a_TexCoord, to.model.texCoordBuffer); // Texture coordinates
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, to.model.indexBuffer); // Bind indices
			// Bind texture object to texture unit
			if (i == 0) {
				gl.activeTexture(gl.TEXTURE0);
			} else {
				gl.activeTexture(gl.TEXTURE1);
			}
			// assign value to u_Sampler accoring to textUnit
			gl.uniform1i(program.u_Sampler, i);
			gl.bindTexture(gl.TEXTURE_2D, to.texture);
			// Draw
			gl.drawElements(gl.TRIANGLES, to.drawingInfo.indices.length, gl.UNSIGNED_BYTE, 0);
		}
	}
}

function drawLightModel(gl, program, viewMatrix, projMatrix) {

	// Coordinate transformation matrix
	var modelMatrix = new Matrix4(); // Model matrix
	var mvpMatrix = new Matrix4(); // Model view projection matrix
	var normalMatrix = new Matrix4();

	gl.useProgram(program);

	// 设置光线方向（世界坐标系下的）
	gl.uniform3f(program.u_LightDirection, sceneDirectionLight[0], sceneDirectionLight[1], sceneDirectionLight[2]);
	// 传入环境光颜色
	gl.uniform3f(program.u_AmbientLight, sceneAmbientLight[0], sceneAmbientLight[1], sceneAmbientLight[2]);
	gl.uniform3f(program.u_LightPosition, eye.elements[0], eye.elements[1], eye.elements[2]);
	gl.uniform3f(program.u_PointLightColor, scenePointLightColor[0], scenePointLightColor[1], scenePointLightColor[2]);

	// draw each SceneObject 
	for (i = 0; i < SceneObjectList.length; i++) {
		var so = SceneObjectList[i];
		if (so.objDoc != null && so.objDoc.isMTLComplete()) { // OBJ and all MTLs are available
			so.drawingInfo = onReadComplete(gl, so.model, so.objDoc);
			SceneObjectList[i].objname = so.objDoc.objects[0].name;
			so.objname = so.objDoc.objects[0].name;
			so.objDoc = null;
		}
		if (so.drawingInfo) {
			// initialize the model matrix
			modelMatrix.setIdentity();
			if (i == 1) { // if the model is bird
				var gumby = ObjectList[SceneObjectList.length - 1].transform;
				var bird = ObjectList[i].transform;
				// set the bird at gumby's position
				modelMatrix.translate(gumby[0].content[0], gumby[0].content[1], gumby[0].content[2]);
				modelMatrix.scale(bird[1].content[0], bird[1].content[1], bird[1].content[2]);
				// let the bird fly
				//drawFlyingbird(modelMatrix);
			} else { // for other model
				var transTypes = ObjectList[i].transform.length;
				for (var m = 0; m < transTypes; m++) { // initialize all the transform for this model
					initModelMatrix(modelMatrix, ObjectList[i].transform, m);
				}
			}
			if (isAnimate) {
				switch (i) {
				case 0:
					modelMatrix = modelAnimate0(modelMatrix);
					break;
				case 1:
					modelMatrix = modelAnimate1(modelMatrix);
					break;
				case 2:
					modelMatrix = modelAnimate2(modelMatrix);
					break;
				case 3:
					modelMatrix = modelAnimate3(modelMatrix);
					break;
				case 4:
					modelMatrix = modelAnimate4(modelMatrix);
					break;
				case 5:
					modelMatrix = modelAnimate5(modelMatrix);
					break;
				default:
					break;
			}
			}
			gl.uniformMatrix4fv(program.u_ModelMatrix, false, modelMatrix.elements);

			mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
			gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);

			// initialize the normal Matrix
			normalMatrix.setInverseOf(modelMatrix);
			normalMatrix.transpose();
			gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements);

			// initialize all the attributes
			initAttributeVariable(gl, program.a_Position, so.model.vertexBuffer); // Vertex coordinates
			initAttributeVariable(gl, program.a_Normal, so.model.normalBuffer); // Normal
			initAttributeVariable(gl, program.a_Color, so.model.colorBuffer); // color

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, so.model.indexBuffer);
			// Draw
			gl.drawElements(gl.TRIANGLES, so.drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
		}
	}
}

// help the initalize all the transform the model[index] has
function initModelMatrix(modelMatrix, trans, index) {
	switch (trans[index].type) {
		case "translate":
			modelMatrix.translate(trans[index].content[0], trans[index].content[1], trans[index].content[2]);
			break;
		case "rotate":
			modelMatrix.rotate(trans[index].content[0], trans[index].content[1], trans[index].content[2], trans[index].content[3]);
			break;
		case "scale":
			modelMatrix.scale(trans[index].content[0], trans[index].content[1], trans[index].content[2]);
			break;
		default:
			break;
	}
}

function initAttributeVariable(gl, attribute, buffer) {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	// 将缓冲区对象分配给attribute变量
	gl.vertexAttribPointer(attribute, buffer.num, buffer.type, false, 0, 0);
	// 连接attribute变量与分配给它的缓冲区对象
	gl.enableVertexAttribArray(attribute);
}

function initTextureProgram(gl) {

	// 获取变量的存储位置
	textureProgram.a_Position = gl.getAttribLocation(textureProgram, 'a_Position');
	textureProgram.a_Normal = gl.getAttribLocation(textureProgram, 'a_Normal');
	textureProgram.a_TexCoord = gl.getAttribLocation(textureProgram, 'a_TexCoord');
	textureProgram.u_ModelMatrix = gl.getUniformLocation(textureProgram, 'u_ModelMatrix');
	textureProgram.u_MvpMatrix = gl.getUniformLocation(textureProgram, 'u_MvpMatrix');
	textureProgram.u_NormalMatrix = gl.getUniformLocation(textureProgram, 'u_NormalMatrix');
	textureProgram.u_Sampler = gl.getUniformLocation(textureProgram, 'u_Sampler');
	textureProgram.u_LightDirection = gl.getUniformLocation(textureProgram, 'u_LightDirection');
	textureProgram.u_AmbientLight = gl.getUniformLocation(textureProgram, 'u_AmbientLight');
	textureProgram.u_LightPosition = gl.getUniformLocation(textureProgram, 'u_LightPosition');
	textureProgram.u_PointLightColor = gl.getUniformLocation(textureProgram, 'u_PointLightColor');
	textureProgram.isPointLightOn = gl.getUniformLocation(textureProgram, 'isPointLightOn');

	if (textureProgram.a_Position < 0 || textureProgram.a_Normal < 0 || textureProgram.a_TexCoord < 0 || !textureProgram.u_MvpMatrix || !textureProgram.u_NormalMatrix || !textureProgram.u_Sampler || !textureProgram.u_ModelMatrix || !textureProgram.u_LightDirection || !textureProgram.u_AmbientLight || !textureProgram.u_LightPosition || !textureProgram.u_PointLightColor) {
		console.log('Failed to get the storage location of attribute or uniform variable in texture shader');
		return;
	}

	// 初始化木箱和地板
	for (i = 0; i < 2; i++) {
		var textureObject = new TexObject();
		textureObject.model = initTextureVertexBuffers(gl, textureProgram);
		if (!textureObject.model) {
			console.log('Failed to set the vertex information');
			continue;
		}
		// initialize the texture infomation for the object
		textureObject.texture = initTexture(gl, textureProgram, i);
		if (!textureObject.texture) {
			console.log('Failed to intialize the texture.');
			continue;
		}

		//压入物体列表中
		textureObjectList.push(textureObject);
	}
}

// initialize light program
function initLightProgram(gl) {
	
	// 获取变量的存储位置
	lightProgram.a_Position = gl.getAttribLocation(lightProgram, 'a_Position');
	lightProgram.a_Color = gl.getAttribLocation(lightProgram, 'a_Color');
	lightProgram.a_Normal = gl.getAttribLocation(lightProgram, 'a_Normal');
	lightProgram.u_ModelMatrix = gl.getUniformLocation(lightProgram, 'u_ModelMatrix');
	lightProgram.u_MvpMatrix = gl.getUniformLocation(lightProgram, 'u_MvpMatrix');
	lightProgram.u_NormalMatrix = gl.getUniformLocation(lightProgram, 'u_NormalMatrix');
	lightProgram.u_LightDirection = gl.getUniformLocation(lightProgram, 'u_LightDirection');
	lightProgram.u_AmbientLight = gl.getUniformLocation(lightProgram, 'u_AmbientLight');
	lightProgram.u_LightPosition = gl.getUniformLocation(lightProgram, 'u_LightPosition');
	lightProgram.u_PointLightColor = gl.getUniformLocation(lightProgram, 'u_PointLightColor');
	lightProgram.isPointLightOn = gl.getUniformLocation(lightProgram, 'isPointLightOn');

	if (lightProgram.a_Position < 0 || lightProgram.a_Color < 0 || lightProgram.a_Normal < 0 || !lightProgram.u_MvpMatrix || !lightProgram.u_NormalMatrix || !lightProgram.u_ModelMatrix || !lightProgram.u_LightDirection || !lightProgram.u_AmbientLight || !lightProgram.u_PointLightColor || !lightProgram.u_LightPosition) {
		console.log('Failed to get the storage location of attribute or uniform variable in light shader');
		return;
	}

	for (var i = 0; i < ObjectList.length; i++) {
		var e = ObjectList[i];
		var lightObject = new SceneObject();
		lightObject.model = initColorVertexBuffers(gl, lightProgram);
		if (!lightObject.model) {
			console.log('Failed to set the vertex information');
			lightObject.valid = 0;
			continue;
		}
		lightObject.valid = 1;
		lightObject.kads = e.kads;
		lightObject.transform = e.transform;
		lightObject.objFilePath = e.objFilePath;
		lightObject.color = e.color;
		//补齐最后一个alpha值
		if (lightObject.color.length == 3) {
			lightObject.color.push(1.0);
		}
		// Start reading the OBJ file
		readOBJFile(lightObject, gl, 1.0, true);

		//压入物体列表中
		SceneObjectList.push(lightObject);
	}
}

// 按下键盘
function keydown(ev, gl) {
	switch (ev.keyCode) {
		case 37: // ←
			isTransLeft = true;
			break;
		case 39: // →
			isTransRight = true;
			break;
		case 38: // ↑
			isTransUp = true;
			break;
		case 40: // ↓
			isTransDown = true;
			break;
			// rotation
		case 74: // J
			isRotateLeft = true;
			break;
		case 75: // K
			isRotateRight = true;
			break;
		case 65: // A
			isAnimate = true;
			break;
		case 76: // L
			isPointLightOn = 1;
			togglePointLight();
			break;
		default:
			return;
			break;
	}
}
// 放开键盘
function keyup(ev, gl) {
	switch (ev.keyCode) {
		case 37: // A ←
			isTransLeft = false;
			break;
		case 39: // D →
			isTransRight = false;
			break;
		case 38: // W ↑
			isTransUp = false;
			break;
		case 40: // S ↓
			isTransDown = false;
			break;
			// rotation
		case 74: // J
			isRotateLeft = false;
			break;
		case 75: // K
			isRotateRight = false;
			break;
		case 65: // A
			isAnimate = false;
			break;
		case 76: // L
			isPointLightOn = 0;
			togglePointLight();
			break;
		default:
			return;
			break;
	}
}

function togglePointLight() {
	gl.useProgram(lightProgram);
	gl.uniform1i(lightProgram.isPointLightOn, isPointLightOn);
	gl.useProgram(textureProgram);
	gl.uniform1i(textureProgram.isPointLightOn, isPointLightOn);
	drawAll();
}

function initTextureVertexBuffers(gl, program) {

	var o = new Object(); // Utilize Object object to return multiple buffer objects
	o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
	o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
	o.texCoordBuffer = createEmptyArrayBuffer(gl, program.a_TexCoord, 2, gl.FLOAT);
	// 创建缓冲区对象
	o.indexBuffer = gl.createBuffer();

	if (!o.vertexBuffer || !o.normalBuffer || !o.indexBuffer || !o.texCoordBuffer) {
		console.log("Failed to create the buffer object ");
		return -1;
	}

	// 将缓冲区对象绑定到目标
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return o;
}

function initColorVertexBuffers(gl, program) {
	var o = new Object(); // Utilize Object object to return multiple buffer objects
	o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
	o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
	o.colorBuffer = createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT);
	// 创建缓冲区对象
	o.indexBuffer = gl.createBuffer();
	if (!o.vertexBuffer || !o.normalBuffer || !o.colorBuffer || !o.indexBuffer) {
		console.log("Failed to create the buffer object ");
		return -1;
	}

	// 将缓冲区对象绑定到目标
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return o;
}

// bind the data according to scene file
function readConfig(gl, model, i) {

	var drawingInfo;
	if (i == FLOORFLAG) { // if is floor
		drawingInfo = floorRes;
	} else { // box
		drawingInfo = boxRes;
	}

	// 向缓冲区对象中写入数据
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawingInfo.vertex), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawingInfo.normal), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, model.texCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawingInfo.texCoord), gl.STATIC_DRAW);

	drawingInfo.indices = new Uint8Array(drawingInfo.index);

	// Write the indices to the buffer object
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

	return drawingInfo;
}

function initTexture(gl, program, texUnit) {

	// 创建纹理对象
	var texture = gl.createTexture();
	if (!texture) {
		console.log('Failed to create the texture object');
		return null;
	}

	// 创建image对象
	var image = new Image();
	if (!image) {
		console.log('Failed to create the image object');
		return null;
	}

	// 注册图像加载事件的响应函数
	image.onload = function() {
		loadTexture(gl, texture, program, image, texUnit);
	};

	// 浏览器开始加载图像
	if (texUnit == FLOORFLAG) { // if floor
		image.src = floorRes.texImagePath;
	} else if (texUnit == BOXFLAG) { // if box
		image.src = boxRes.texImagePath;
	}

	return texture;
}

function loadTexture(gl, texture, program, image, texUnit) {

	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // 对纹理图像进行y轴反转
	switch (texUnit) {
	case 0:
		gl.activeTexture(gl.TEXTURE0); // 开启0号纹理单元
		isTexUnit0 = true;
		break;
	case 1:
		gl.activeTexture(gl.TEXTURE1); // 开启1号纹理单元
		isTexUnit1 = true;
		break;
	default:
		break;
	}
	gl.bindTexture(gl.TEXTURE_2D, texture); // 向target绑定纹理对象
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // 配置纹理参数
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); // 配置纹理图像

	// 将纹理单元传递给着色器中的取样器变量
	gl.useProgram(program);
	gl.uniform1i(program.u_Sampler, texUnit);

	gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
}

function createEmptyArrayBuffer(gl, attribute, num, type) {
	var buffer = gl.createBuffer(); // Create a buffer object
	if (!buffer) {
		console.log('Failed to create the buffer object');
		return null;
	}
	// 将数据写入缓冲区并开启
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.vertexAttribPointer(attribute, num, type, false, 0, 0);
	gl.enableVertexAttribArray(attribute); // 开启缓冲区分配

	//在buffer中填入type和element数量信息，以备之后绘制过程中绑定shader使用
	buffer.num = num;
	buffer.type = type;

	return buffer;
}

// 读取OBJ文件
function readOBJFile(so, gl, scale, reverse) {
	var request = new XMLHttpRequest();

	request.onreadystatechange = function() {
		if (request.readyState === 4 && request.status !== 404) {
			onReadOBJFile(request.responseText, so, gl, scale, reverse);
		}
	}
	request.open('GET', so.objFilePath, true); // Create a request to acquire the file
	request.send(); // Send the request
}

// OBJ文件已经被读取
function onReadOBJFile(fileString, so, gl, scale, reverse) {
	var objDoc = new OBJDoc(so.filePath); // Create a OBJDoc object
	objDoc.defaultColor = so.color;
	var result = objDoc.parse(fileString, scale, reverse); // Parse the file
	if (!result) {
		so.objDoc = null;
		so.drawingInfo = null;
		console.log("OBJ file parsing error.");
		return;
	}
	so.objDoc = objDoc;
}

// OBJ File has been read compreatly
function onReadComplete(gl, model, objDoc) {
	// Acquire the vertex coordinates and colors from OBJ file
	var drawingInfo = objDoc.getDrawingInfo();

	// Write date into the buffer object
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

	// Write the indices to the buffer object
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);
	return drawingInfo;
}

// 记录上一次调用函数的时刻
var last = []; 
for (var i = 0; i < 10; i++) {
	last[i] = Date.now();
}

function calElapsed(i) {
	// 计算距离上次调用经过多长的时间
	var now = Date.now();
	var elapsed = now - last[i]; // 毫秒
	last[i] = now;
	return elapsed;
}

function cameraAnimate() {

	var elapsed = calElapsed(9);

	// Update the current camara eye, at up (adjusted by the elapsed time)
	var step = (MOVE_VELOCITY * elapsed) / 1000.0;
	var dirLen = getLen(dir);
	if (isTransLeft) {
		goHor(-step);
	}
	if (isTransRight) {
		goHor(step);
	}
	if (isTransUp) {
		goInNOut(step, dirLen);
	}
	if (isTransDown) {
		goInNOut(-step, dirLen);
	}
	var angle = (ROT_VELOCITY * elapsed) / 1000.0;
	angle = angle * Math.PI / 180.0;
	if (isRotateLeft) {
		turnHor(-angle);
	}
	if (isRotateRight) {
		turnHor(angle);
	}
}

// camera move forward or back
function goInNOut(step, dirLen) {
	var rate = step / dirLen;
	var move = VectorMultNum(dir, rate); // get the step on dir direction
	eye = VectorAdd(eye, move); // update eye accoring to "move"
	updateCamara();
}
// camera move on the left or right
function goHor(step) {
	var movDir = VectorCross(dir, up); // get the hor direction
	var rate = step / getLen(movDir);
	movDir = VectorMultNum(movDir, rate); // get the step on movDir direction
	eye = VectorAdd(eye, movDir); // update eye accoring to "movDir"
	updateCamara();
}
// camera turn right or left
function turnHor(angle) {
	var ro = getRotate(angle);
	var tmp0 = dir.elements[0];
	var tmp2 = dir.elements[2];
	dir.elements[0] = ro.elements[0] * tmp0 + ro.elements[2] * tmp2;
	dir.elements[2] = ro.elements[1] * tmp0 + ro.elements[0] * tmp2;
	updateCamara();
}
// get the rotating info according to the angle
function getRotate(angle) {
	var cos = Math.cos(angle);
	var sin = Math.sin(angle);
	return new Vector4([cos, sin, -sin, -cos]);
}
// update the camera infomation
function updateCamara() {
	at.elements[0] = eye.elements[0] + dir.elements[0];
	at.elements[1] = eye.elements[1] + dir.elements[1];
	at.elements[2] = eye.elements[2] + dir.elements[2];
}
// get the lenghth of v
function getLen(v) {
	return Math.sqrt(Math.pow(v.elements[0], 2) + Math.pow(v.elements[1], 2) + Math.pow(v.elements[2], 2));
}

// draw rotating
var rotateAngle = 0;
var ROTATE_STEP = 360;
var STEP_VELOCITY = 3;

function modelAnimate0(modelMatrix) {
	var elapsed = calElapsed(0);
	rotateAngle += elapsed / 1000.0;
	var rot = Math.sin(rotateAngle) * ROTATE_STEP;
	var step = Math.sin(rotateAngle) * STEP_VELOCITY;
	modelMatrix.rotate(rot, 1, 0, 0);
	modelMatrix.translate(step, 0, 0);
	return modelMatrix;
}

// draw flying birds
var flyAngle = 0.0;
var flyHeight = 5.0;
var FLY_ROTATE_STEP = 180;
function modelAnimate1(modelMatrix) {
	var elapsed = calElapsed(1);
	flyAngle += (FLY_ROTATE_STEP * elapsed) / 1000.0 % 360;
	flyHeight = Math.sin(flyAngle * 0.3 * Math.PI / 180) ;

	modelMatrix.rotate(flyAngle, 0, 1, 0);
	modelMatrix.translate(2, flyHeight, 0);
	return modelMatrix;
}

function modelAnimate2(modelMatrix) {
	var elapsed = calElapsed(2);
	rotateAngle += elapsed / 1000.0;
	var rot = Math.sin(rotateAngle) * ROTATE_STEP;
	var step = Math.sin(rotateAngle) * STEP_VELOCITY / 30;
	modelMatrix.rotate(rot, 1, 0, 0);
	modelMatrix.translate(step, 0, 0);
	return modelMatrix;
}

function modelAnimate3(modelMatrix) {
	var elapsed = calElapsed(3);
	rotateAngle += elapsed / 1000.0;
	var rot = Math.sin(rotateAngle) * ROTATE_STEP;
	var step = Math.sin(rotateAngle) * STEP_VELOCITY / 30;
	modelMatrix.rotate(rot, 1, 0, 0);
	modelMatrix.translate(step, 0, 0);
	return modelMatrix;
}

function modelAnimate4(modelMatrix) {
	var elapsed = calElapsed(4);
	rotateAngle += elapsed / 1000.0;
	var rot = Math.sin(rotateAngle) * ROTATE_STEP;
	var step = Math.sin(rotateAngle) * STEP_VELOCITY / 30;
	modelMatrix.rotate(rot, 1, 0, 0);
	modelMatrix.translate(step, 0, 0);
	return modelMatrix;
}

function modelAnimate5(modelMatrix) {
	var elapsed = calElapsed(5);
	rotateAngle += elapsed / 1000.0;
	var rot = Math.sin(rotateAngle) * ROTATE_STEP;
	var step = Math.sin(rotateAngle) * STEP_VELOCITY / 30;
	modelMatrix.rotate(rot, 0, 1, 0);
	modelMatrix.translate(step, 0, 0);
	return modelMatrix;
}
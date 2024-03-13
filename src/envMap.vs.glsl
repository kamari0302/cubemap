#version 300 es
precision highp float;

layout(location=0) in vec3 aPosition;

uniform mat4 uModelView;
uniform mat4 uProjection;

out vec3 vPosition;

void main() {
    vPosition = aPosition;
    
    vec4 pos = uProjection * uModelView * vec4(aPosition, 1.0);
    gl_Position = pos.xyzw;
    
}


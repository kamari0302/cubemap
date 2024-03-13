#version 300 es
precision highp float;

layout(location=0) in vec3 aPosition;  
layout(location=1)in vec3 color;
layout(location=2)in vec3 aNormalAttrib; 
layout(location=3)in vec2 aTexCoords; 

uniform mat4 uModelView;
uniform mat4 uProjection;
uniform mat3 uNormal;

out vec3 vColor;
out vec2 vTexCoords; 
out float vIntensity;

void main() {
    vColor = color;
    vTexCoords = aTexCoords; 
    vec3 centeredPos = aPosition - vec3(0.5,0.5,0.5);
    gl_Position = uProjection * uModelView * vec4(centeredPos, 1.0);
    vec3 n = normalize(uNormal * aNormalAttrib);
    vIntensity = abs(n.z);
}


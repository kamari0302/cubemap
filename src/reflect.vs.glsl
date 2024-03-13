#version 300 es
precision highp float;

layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uModelView;
uniform mat4 uProjection;
uniform mat3 uNormal;

out vec3 vPosition;
out vec3 vNormal;

void main() {
    vec4 position = uModelView * vec4(aPosition, 1.0);

    // Weltkoordinaten für Position/Normale
    vNormal = normalize(uNormal * aNormal);
    vPosition = (uModel * vec4(aPosition, 1.0)).xyz;

    gl_Position = uProjection * position;
}


#version 300 es
precision highp float;

in vec3 vPosition;

uniform samplerCube uCubemap;

out vec4 fColor;

void main() {
    fColor = texture(uCubemap,normalize(vec3(-vPosition.x,vPosition.y,vPosition.z)));
}

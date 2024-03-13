#version 300 es
precision highp float;

in vec3 vColor;
in vec2 vTexCoords; 
in float vIntensity;

uniform sampler2D uTexture; 

out vec4 fColor;

void main() {
    vec4 texColor = texture(uTexture, vTexCoords); 
    fColor = texColor ; //* vec4(vColor * vIntensity, 1.0);
}
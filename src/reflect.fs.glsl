#version 300 es
precision highp float;

in vec3 vPosition;
in vec3 vNormal;

uniform samplerCube uCubemap;

out vec4 fColor;

void main() {
    vec3 viewDir = normalize(vPosition);
    // vec3 reflectionVec = refract(viewDir,normalize(vNormal),0.5);
    vec3 reflectionVec = reflect(viewDir,normalize(vNormal));

    // Weltkoordinaten für Texturzugriff
    vec3 color = texture(uCubemap,vec3(-reflectionVec.x, reflectionVec.y, reflectionVec.z)).rgb;
    // fColor = vec4(mix(color,vec3(1.0,1.0,1.0),0.3),1.0);
    fColor = vec4(color,1.0);
}


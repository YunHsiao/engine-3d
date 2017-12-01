attribute vec3 a_position;

uniform mat4 model;
uniform mat4 viewProj;
uniform mat3 normalMatrix;

{{#useUV0}}
  attribute vec2 a_uv0;
  varying vec2 uv0;
{{/useUV0}}

{{#useNormal}}
  attribute vec3 a_normal;
  varying vec3 normal_w;
{{/useNormal}}

varying vec3 pos_w;

{{#useSkinning}}
  {{> skinning.vert}}
{{/useSkinning}}

{{#useShadowMap}}
  uniform mat4 lightViewProjMatrix;
  uniform float minDepth;
  uniform float maxDepth;
  varying vec4 pos_lightspace;
  varying float vDepth;
{{/useShadowMap}}

void main () {
  vec4 pos = vec4(a_position, 1);

  {{#useSkinning}}
    mat4 skinMat = skinMatrix();
    pos = skinMat * pos;
  {{/useSkinning}}

  pos_w = (model * pos).xyz;
  pos = viewProj * model * pos;

  {{#useUV0}}
    uv0 = a_uv0;
  {{/useUV0}}

  {{#useNormal}}
    vec4 normal = vec4(a_normal, 0);
    {{#useSkinning}}
      normal = skinMat * normal;
    {{/useSkinning}}
    normal_w = normalMatrix * normal.xyz;
    normal_w = normalize(normal_w);
  {{/useNormal}}

  {{#useShadowMap}}
    pos_lightspace = lightViewProjMatrix * vec4(pos_w, 1.0);
    vDepth = (pos_lightspace.z + minDepth) / (minDepth + maxDepth);
  {{/useShadowMap}}

  gl_Position = pos;
}
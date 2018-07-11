precision mediump float;

uniform float u_lightBrightness;
uniform float u_shininess;

uniform vec3 u_lightPosition;
uniform vec3 u_lightColor;
uniform vec3 u_specularColor;
uniform vec3 u_cameraPosition;

uniform sampler2D u_texture;
uniform sampler2D u_specularMask;
uniform sampler2D u_bumpMap;
uniform sampler2D u_clouds;
uniform sampler2D u_cityLights;

varying vec3 v_normal;
varying vec2 v_texture;

void main()
{
    vec4 color = texture2D(u_texture, v_texture);
    vec3 mask = 1.0 - texture2D(u_specularMask, v_texture).rgb;
    vec3 bump = texture2D(u_bumpMap, v_texture).rgb;
    vec3 clouds = texture2D(u_clouds, v_texture).rgb;
    vec4 city = texture2D(u_cityLights, v_texture);

    vec3 lightDirection = normalize(u_lightPosition);
    vec3 cameraDirection = normalize(u_cameraPosition);
    vec3 halfv = normalize(lightDirection - cameraDirection);

    float light = max(0.0, dot(v_normal, lightDirection));

    float specular = 0.0;
    if (light > 0.0)
        specular = max(0.0, pow(dot(v_normal, halfv), u_shininess));

    vec4 night = city * u_lightBrightness + vec4(clouds * 0.1, 0.6);
    night.rgb *= 0.3 - (light * u_lightColor * u_lightBrightness);

    vec4 day = color * u_lightBrightness + vec4(clouds * u_lightBrightness, 0.9);
    day.rgb *= light * u_lightColor * u_lightBrightness;
    day.rgb += specular * u_specularColor * u_lightBrightness * mask;

    gl_FragColor = night + day;
}

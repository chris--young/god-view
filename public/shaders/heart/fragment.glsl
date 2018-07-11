precision mediump float;

uniform vec3 u_cameraPosition;
uniform vec3 u_lightPosition;
uniform vec3 u_lightColor;
uniform vec3 u_specularColor;
uniform vec4 u_color;

uniform float u_lightBrightness;
uniform float u_shininess;

varying vec3 v_normal;

void main()
{
    vec3 lightDirection = normalize(u_lightPosition);
    vec3 cameraDirection = normalize(u_cameraPosition);
    vec3 halfv = normalize(lightDirection - cameraDirection);

    float diffuse = max(0.0, dot(v_normal, lightDirection));
    float specular = 0.0;

    if (diffuse > 0.0)
        specular = max(0.0, pow(dot(v_normal, halfv), u_shininess));

    gl_FragColor = vec4(u_color.rgb * (u_lightBrightness * 0.33), u_color.a);
    gl_FragColor.rgb += u_lightColor * (diffuse * u_lightBrightness * 0.33);
    gl_FragColor.rgb += u_specularColor * (specular * u_lightBrightness * 0.33);
}

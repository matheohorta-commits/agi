// "Instruction booklet" line art: dark outlines where the depth or the surface direction jumps
// (silhouettes, brick edges, seams), drawn over the shaded picture like the renders in a LEGO booklet.
// Uses the normal + depth buffers that the GTAO pass renders anyway.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export class InkPass extends Pass {
  constructor(gtao, camera, strength = 0.75) {
    super();
    this.gtao = gtao;
    this.camera = camera;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) }, cameraNear: { value: 1 }, cameraFar: { value: 900 },
        strength: { value: strength }, inkColor: { value: new THREE.Color(0x0e1826) },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        #include <packing>
        uniform sampler2D tDiffuse; uniform sampler2D tNormal; uniform sampler2D tDepth;
        uniform vec2 resolution; uniform float cameraNear; uniform float cameraFar; uniform float strength; uniform vec3 inkColor;
        varying vec2 vUv;
        float viewZ(float d) { return -perspectiveDepthToViewZ(d, cameraNear, cameraFar); }
        vec3 nrm(vec2 uv) { return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0); }
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          vec2 px = 1.0 / resolution;
          float d0 = texture2D(tDepth, vUv).x;
          float z0 = viewZ(d0);
          vec3 n0 = nrm(vUv);
          float e = 0.0;
          for (int i = 0; i < 4; i++) {
            vec2 o = i == 0 ? vec2(px.x, 0.0) : i == 1 ? vec2(-px.x, 0.0) : i == 2 ? vec2(0.0, px.y) : vec2(0.0, -px.y);
            float d1 = texture2D(tDepth, vUv + o).x;
            bool bg0 = d0 >= 0.99999, bg1 = d1 >= 0.99999;
            if (bg0 != bg1) { e = 1.0; continue; }
            if (bg0) continue;
            float z1 = viewZ(d1);
            e = max(e, smoothstep(0.006, 0.02, abs(z1 - z0) / min(z0, z1)));
            e = max(e, smoothstep(0.2, 0.5, 1.0 - dot(n0, nrm(vUv + o))));
          }
          e *= strength;
          vec3 ink = mix(c.rgb * 0.35, inkColor, 0.35);
          gl_FragColor = vec4(mix(c.rgb, ink, e), max(c.a, e));
        }`,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setSize(w, h) { this.material.uniforms.resolution.value.set(w, h); }

  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tNormal.value = this.gtao.normalTexture;
    u.tDepth.value = this.gtao.depthTexture;
    u.cameraNear.value = this.camera.near;
    u.cameraFar.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }

  dispose() { this.material.dispose(); this.fsQuad.dispose(); }
}

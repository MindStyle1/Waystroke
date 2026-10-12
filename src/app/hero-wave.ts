/** Looping GLSL background; the readable HTML is independent of the canvas. */
export function initHeroWave(
  host: HTMLElement,
  variant: 'wave' | 'paper' | 'lime' | 'hybrid' = 'wave',
): () => void {
  const hero = host.querySelector<HTMLElement>('.hero');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-wave';
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return () => {};
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertex = compile(
    gl.VERTEX_SHADER,
    'attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}',
  );
  const paperMotion = variant === 'paper' || variant === 'hybrid';
  const alternative =
    variant === 'hybrid'
      ? `precision mediump float;
    varying vec2 uv; uniform float progress; uniform float aspect;
    uniform float spotlightPhase; uniform vec2 spotlightOrigin; uniform vec2 spotlightTravel;
    void main(){
      float t=progress*6.283185;
      vec2 p=vec2(uv.x*aspect,uv.y);
      vec2 a=vec2(aspect*(.49+.06*sin(t)),.62+.07*cos(t));
      vec2 b=vec2(aspect*(.68-.04*sin(t)),.46+.09*sin(t));
      float field=exp(-dot(p-a,p-a)*11.)+exp(-dot(p-b,p-b)*17.)*.7;
      float ink=smoothstep(.25,1.22,field)*.32;
      float orbit=spotlightPhase*6.283185;
      vec2 spot=spotlightOrigin+spotlightTravel*vec2(sin(orbit),cos(orbit));
      vec2 delta=p-vec2(spot.x*aspect,spot.y);
      ink+=exp(-dot(delta,delta)*22.)*.24;
      float d=uv.x+uv.y*.20-(.55+.72*sin(t));
      float light=exp(-d*d*24.)*.24;
      float shadow=exp(-(d+.21)*(d+.21)*19.)*.08;
      vec3 paper=mix(vec3(.37,.30,.22),vec3(1.,.99,.94),light/(light+shadow+.001));
      float alpha=ink+light+shadow;
      vec3 color=(vec3(.73,.91,.30)*ink+paper*(light+shadow))/(alpha+.001);
      gl_FragColor=vec4(color,alpha);
    }`
      : variant === 'paper'
        ? `precision mediump float;
    varying vec2 uv; uniform float progress; uniform float aspect;
    float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){
      float sweep=mix(-.55,1.65,progress);
      float d=uv.x+uv.y*.20-sweep;
      float light=exp(-d*d*24.);
      float shadow=exp(-(d+.21)*(d+.21)*19.);
      float fiber=grain(uv*vec2(900.,620.));
      float fade=sin(progress*3.14159);
      float brightness=light*.72;
      float depth=shadow*.28;
      vec3 color=mix(vec3(.37,.30,.22),vec3(1.,.99,.94),brightness/(brightness+depth+.001));
      gl_FragColor=vec4(color,(brightness+depth+fiber*.025)*fade);
    }`
        : variant === 'lime'
          ? `precision mediump float;
    varying vec2 uv; uniform float progress; uniform float aspect;
    void main(){
      vec2 p=vec2(uv.x*aspect,uv.y);
      float t=progress*3.14159;
      vec2 a=vec2(aspect*(.48+.07*sin(t)),.60+.08*cos(t));
      vec2 b=vec2(aspect*(.68-.05*sin(t)),.45+.12*sin(t));
      vec2 c=vec2(aspect*.61,.79-.10*sin(t));
      float field=exp(-dot(p-a,p-a)*11.)+exp(-dot(p-b,p-b)*17.)*.7+exp(-dot(p-c,p-c)*25.)*.45;
      float ink=smoothstep(.25,1.25,field);
      gl_FragColor=vec4(vec3(.73,.91,.30),ink*.56*sin(t));
    }`
          : null;
  const fragment = compile(
    gl.FRAGMENT_SHADER,
    alternative ??
      `precision mediump float;
    varying vec2 uv; uniform float progress; uniform float aspect;
    void main(){
      float x=uv.x + (1.-uv.y)*.22;
      float center=mix(-.45,1.8,progress);
      float bend=sin(uv.y*3.14)*.06;
      float distance=x-center+bend;
      float envelope=exp(-distance*distance*35.);
      float fold=sin(distance*13. + uv.y*1.4);
      float fade=sin(progress*3.14159);
      float shade=envelope*fade;
      vec3 color=mix(vec3(.23,.29,.18),vec3(1.,1.,.93),smoothstep(-.3,.6,fold));
      gl_FragColor=vec4(color,shade*.24);
    }`,
  );
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return () => {};
  }
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return () => {};
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const progress = gl.getUniformLocation(program, 'progress');
  const spotlightPhase = gl.getUniformLocation(program, 'spotlightPhase');
  const spotlightOrigin = gl.getUniformLocation(program, 'spotlightOrigin');
  const spotlightTravel = gl.getUniformLocation(program, 'spotlightTravel');
  gl.uniform1f(
    gl.getUniformLocation(program, 'aspect'),
    hero.getBoundingClientRect().width / hero.getBoundingClientRect().height,
  );
  const rect = hero.getBoundingClientRect();
  const ratio = Math.min(1, 1200 / rect.width);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  gl.viewport(0, 0, canvas.width, canvas.height);
  hero.prepend(canvas);
  hero.classList.add('hero--wave', `hero--${variant}`);
  let frame = 0,
    elapsed = 0,
    previous = performance.now(),
    last = 0,
    disposed = false;
  const stop = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    canvas.remove();
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    document.removeEventListener('visibilitychange', onVisibility);
    observer.disconnect();
    resize.disconnect();
    reduced.removeEventListener('change', stop);
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  const onVisibility = () => {
    previous = performance.now();
    cancelAnimationFrame(frame);
    if (!document.hidden && visible && !disposed) frame = requestAnimationFrame(render);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    onVisibility();
  });
  observer.observe(hero);
  const resize = new ResizeObserver(() => {
    const bounds = hero.getBoundingClientRect();
    const scale = Math.min(1, 1200 / bounds.width);
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, 'aspect'), bounds.width / bounds.height);
    const title = hero.querySelector<HTMLElement>('.hero__title')?.getBoundingClientRect();
    if (title) {
      gl.uniform2f(
        spotlightOrigin,
        (title.left - bounds.left + title.width * 0.5) / bounds.width,
        1 - (title.top - bounds.top + title.height * 0.5) / bounds.height,
      );
      gl.uniform2f(
        spotlightTravel,
        (title.width * 0.28) / bounds.width,
        (title.height * 0.23) / bounds.height,
      );
    }
  });
  resize.observe(hero);
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', stop);
  const cycleDuration =
    variant === 'hybrid' ? 16000 : paperMotion ? 8000 : variant === 'lime' ? 7200 : 6000;
  const render = (now: number) => {
    if (disposed || document.hidden || !visible) return;
    elapsed += now - previous;
    previous = now;
    // Hybrid uses a full periodic orbit; the phase wraps without fading or jumping.
    const p = (elapsed % cycleDuration) / cycleDuration;
    if (now - last >= 32) {
      last = now;
      gl.uniform1f(progress, p);
      gl.uniform1f(spotlightPhase, (elapsed % 28000) / 28000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);
  return () => {
    stop();
    hero.classList.remove('hero--wave', `hero--${variant}`);
  };
}

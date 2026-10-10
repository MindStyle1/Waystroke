/** One-shot GLSL study; the readable HTML is independent of the canvas. */
export function initHeroWave(
  host: HTMLElement,
  variant: 'wave' | 'paper' | 'lime' | 'hybrid' = 'wave',
): () => void {
  const hero = host.querySelector<HTMLElement>('.hero');
  if (
    !hero ||
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    hero.getBoundingClientRect().bottom < 0
  )
    return () => {};
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
    void main(){
      float t=progress*3.14159;
      vec2 p=vec2(uv.x*aspect,uv.y);
      vec2 a=vec2(aspect*(.49+.06*sin(t)),.62+.07*cos(t));
      vec2 b=vec2(aspect*(.68-.04*sin(t)),.46+.09*sin(t));
      float field=exp(-dot(p-a,p-a)*11.)+exp(-dot(p-b,p-b)*17.)*.7;
      float ink=smoothstep(.25,1.22,field)*.43;
      float d=uv.x+uv.y*.20-mix(-.55,1.65,progress);
      float light=exp(-d*d*24.)*.38;
      float shadow=exp(-pow(d+.21,2.)*19.)*.12;
      vec3 paper=mix(vec3(.37,.30,.22),vec3(1.,.99,.94),light/(light+shadow+.001));
      float alpha=ink+light+shadow;
      vec3 color=(vec3(.73,.91,.30)*ink+paper*(light+shadow))/(alpha+.001);
      gl_FragColor=vec4(color,alpha*sin(t));
    }`
      : variant === 'paper'
        ? `precision mediump float;
    varying vec2 uv; uniform float progress; uniform float aspect;
    float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){
      float sweep=mix(-.55,1.65,progress);
      float d=uv.x+uv.y*.20-sweep;
      float light=exp(-d*d*24.);
      float shadow=exp(-pow(d+.21,2.)*19.);
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
  const animations: Animation[] = [];
  hero.querySelectorAll<HTMLElement>('.hero__word').forEach((word, i) => {
    animations.push(
      word.animate(
        [
          {
            transform: `translateY(${paperMotion ? 12 : 36}px)`,
            opacity: 0.12,
            clipPath: paperMotion ? 'inset(0 100% 0 0)' : 'inset(0)',
          },
          { transform: 'translateY(0)', opacity: 1, clipPath: 'inset(0)' },
        ],
        {
          duration: paperMotion ? 1800 : 1450,
          delay: 280 + i * 200,
          easing: 'cubic-bezier(.22,1,.36,1)',
          fill: 'backwards',
        },
      ),
    );
  });
  let frame = 0,
    started = performance.now(),
    last = 0,
    disposed = false;
  const stop = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    animations.forEach((a) => a.cancel());
    canvas.remove();
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    document.removeEventListener('visibilitychange', onVisibility);
    reduced.removeEventListener('change', stop);
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const onVisibility = () => {
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', stop);
  const render = (now: number) => {
    if (disposed) return;
    const p = Math.min(
      1,
      (now - started) / (paperMotion ? 3600 : variant === 'lime' ? 3400 : 2600),
    );
    if (p === 1) {
      stop();
      return;
    }
    if (now - last >= 32) {
      last = now;
      gl.uniform1f(progress, p);
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

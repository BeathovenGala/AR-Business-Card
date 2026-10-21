/* A-Frame components for the card's 3D content. Loaded as a classic script before the scene parses. */
(function () {
  function roundedPath(path, w, h, r) {
    const x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2, h / 2);
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r);
    path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h);
    path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
    return path;
  }

  // Rounded rectangle: flat, extruded (depth > 0) or a frame outline (border > 0).
  AFRAME.registerComponent("rounded-panel", {
    schema: {
      width: { default: 1 }, height: { default: 0.5 }, radius: { default: 0.04 },
      depth: { default: 0 }, border: { default: 0 },
      color: { type: "color", default: "#ffffff" }, opacity: { default: 1 }, shaded: { default: false },
    },
    update() {
      const d = this.data;
      const shape = roundedPath(new THREE.Shape(), d.width, d.height, d.radius);
      if (d.border > 0) {
        shape.holes.push(roundedPath(new THREE.Path(), d.width - 2 * d.border, d.height - 2 * d.border,
          Math.max(0.002, d.radius - d.border)));
      }
      const geo = d.depth > 0
        ? new THREE.ExtrudeGeometry(shape, { depth: d.depth, bevelEnabled: true, bevelThickness: 0.006,
            bevelSize: 0.006, bevelSegments: 3, curveSegments: 10 })
        : new THREE.ShapeGeometry(shape, 12);
      const Mat = d.shaded ? THREE.MeshStandardMaterial : THREE.MeshBasicMaterial;
      // DoubleSide: the mirrored (scale -1) content group flips triangle winding.
      const mat = new Mat({ color: d.color, transparent: d.opacity < 1, opacity: d.opacity, side: THREE.DoubleSide,
        ...(d.shaded ? { roughness: 0.4, metalness: 0.05 } : {}) });
      const old = this.el.getObject3D("mesh");
      if (old) { old.geometry.dispose(); old.material.dispose(); }
      this.el.setObject3D("mesh", new THREE.Mesh(geo, mat));
    },
    remove() { this.el.removeObject3D("mesh"); },
  });

  // The isometric cube from the printed card, spinning and bobbing, with three orbiting dots.
  AFRAME.registerComponent("ar-cube", {
    schema: { size: { default: 0.13 } },
    init() {
      const s = this.data.size;
      const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.1 });
      const faces = ["#ffd23f", "#ff8a3d", "#22c3e6", "#0f1b3d", "#ff8a3d", "#ffd23f"].map(mat);
      this.cube = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), faces);
      this.cube.rotation.set(0.62, 0.785, 0);
      this.orbit = new THREE.Group();
      ["#22c3e6", "#ff8a3d", "#ffd23f"].forEach((c, i) => {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), new THREE.MeshBasicMaterial({ color: c }));
        const a = (i / 3) * Math.PI * 2;
        dot.position.set(Math.cos(a) * s * 1.15, 0, Math.sin(a) * s * 1.15);
        this.orbit.add(dot);
      });
      this.root = new THREE.Group();
      this.root.add(this.cube, this.orbit);
      this.el.setObject3D("mesh", this.root);
    },
    tick(t) {
      this.cube.rotation.y = 0.785 + t / 1400;
      this.root.position.y = Math.sin(t / 600) * 0.012;
      this.orbit.rotation.y = -t / 900;
      this.orbit.rotation.x = 0.35;
    },
  });

  // Slow opacity pulse, used on the frame around the card.
  AFRAME.registerComponent("pulse", {
    schema: { min: { default: 0.35 }, max: { default: 0.95 }, period: { default: 1800 } },
    tick(t) {
      const m = this.el.getObject3D("mesh");
      if (!m) return;
      const k = (Math.sin((t / this.data.period) * Math.PI * 2) + 1) / 2;
      m.material.opacity = this.data.min + (this.data.max - this.data.min) * k;
      m.material.transparent = true;
    },
  });

  // Small vector icons for the buttons (the default MSDF fonts have no symbol glyphs).
  AFRAME.registerComponent("btn-icon", {
    schema: { type: { default: "play" }, color: { type: "color", default: "#ffffff" } },
    init() {
      const mat = new THREE.MeshBasicMaterial({ color: this.data.color, side: THREE.DoubleSide });
      const g = new THREE.Group();
      const shape = new THREE.Shape();
      if (this.data.type === "play") {
        shape.moveTo(-0.012, -0.016); shape.lineTo(0.018, 0); shape.lineTo(-0.012, 0.016); shape.lineTo(-0.012, -0.016);
        g.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), mat));
      } else if (this.data.type === "bars") {
        [[-0.012, 0.012], [0, 0.024], [0.012, 0.018]].forEach(([x, h]) => {
          const b = new THREE.Mesh(new THREE.PlaneGeometry(0.007, h), mat);
          b.position.set(x, h / 2 - 0.012, 0);
          g.add(b);
        });
      } else if (this.data.type === "globe") {
        g.add(new THREE.Mesh(new THREE.RingGeometry(0.012, 0.0165, 28), mat));
        const meridian = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.03), mat);
        const equator = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.004), mat);
        g.add(meridian, equator);
      } else if (this.data.type === "zoom") {
        g.add(new THREE.Mesh(new THREE.RingGeometry(0.011, 0.015, 28), mat));
        const handle = new THREE.Mesh(new THREE.PlaneGeometry(0.005, 0.014), mat);
        handle.position.set(0.016, -0.016, 0);
        handle.rotation.z = 0.785;
        const h = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.003), mat);
        const v = new THREE.Mesh(new THREE.PlaneGeometry(0.003, 0.012), mat);
        g.add(handle, h, v);
      } else if (this.data.type === "close") {
        [0.785, -0.785].forEach((r) => {
          const b = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.006), mat);
          b.rotation.z = r;
          g.add(b);
        });
      } else {
        const env = new THREE.Mesh(new THREE.RingGeometry(0.009, 0.0145, 28), mat);
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.005, 16), mat);
        g.add(env, dot);
      }
      this.el.setObject3D("mesh", g);
    },
  });
})();

/**
 * Food Paradise 3D WebGL Engine
 * Features:
 * - Procedural, highly-detailed 3D Food Models (Pizza, Burger, Pasta, Sandwich)
 * - Hero 3D interactive stage with 360° drag rotation, auto-spin, and zoom
 * - Seamless integration with hero slider tabs, keyboard navigation, and transitions
 * - Dynamic 3D lighting, soft shadows, steam particle physics, and floating garnish
 * - 3D card tilt & dynamic specular glare on all menu and offer cards
 * - 3D Dish Inspector Modal with real-time 3D ingredient customizer
 * - Table reservation & order confirmation with 3D celebration confetti
 */

(function () {
  'use strict';

  // Ensure Three.js is loaded
  if (typeof THREE === 'undefined') {
    console.error('Three.js is required for Food Paradise 3D.');
    return;
  }

  /* ==========================================================================
     1. TEXTURE & MATERIAL HELPERS (Procedural Canvas Textures)
     ========================================================================== */

  // Generate procedural noise canvas texture for realistic crust/bun/patty surfaces
  function createNoiseTexture(width, height, baseColor, spotColor, density, spotRadius) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = spotColor;
    const count = Math.floor(width * height * density);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = (Math.random() * 0.7 + 0.3) * spotRadius;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // Create toast grill marks texture
  function createGrillTexture(baseColor, grillColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = grillColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';

    for (let i = -128; i < 384; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 160, 256);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Common textures
  const crustTexture = createNoiseTexture(256, 256, '#d98b3c', '#9e561a', 0.0015, 3.5);
  const pattyTexture = createNoiseTexture(256, 256, '#462314', '#241008', 0.003, 3);
  const cheeseTexture = createNoiseTexture(256, 256, '#ffb822', '#e58e09', 0.001, 4);

  /* ==========================================================================
     2. 3D FOOD MODEL BUILDERS
     ========================================================================== */

  // Helper for basil leaves
  function createBasilLeaf(scale = 1) {
    const group = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.25 * scale, 0.4 * scale, 0.15 * scale, 0.85 * scale);
    shape.quadraticCurveTo(0, 1.1 * scale, 0, 1.2 * scale);
    shape.quadraticCurveTo(0, 1.1 * scale, -0.15 * scale, 0.85 * scale);
    shape.quadraticCurveTo(-0.25 * scale, 0.4 * scale, 0, 0);

    const geom = new THREE.ShapeGeometry(shape, 12);
    // Add slight curvature
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, -Math.sin((x / scale) * Math.PI) * 0.08 * scale + Math.sin((y / scale) * Math.PI) * 0.05 * scale);
    }
    geom.computeVertexNormals();
    pos.needsUpdate = true;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const leaf = new THREE.Mesh(geom, mat);
    leaf.castShadow = true;
    leaf.rotation.x = -Math.PI / 2;
    group.add(leaf);
    return group;
  }

  // Helper for black olive ring
  function createOliveRing(scale = 1) {
    const geom = new THREE.TorusGeometry(0.16 * scale, 0.065 * scale, 12, 20);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x241d28,
      roughness: 0.25,
      metalness: 0.2
    });
    const olive = new THREE.Mesh(geom, mat);
    olive.rotation.x = Math.PI / 2;
    olive.castShadow = true;
    return olive;
  }

  // Helper for mushroom slice
  function createMushroomSlice(scale = 1) {
    const group = new THREE.Group();
    // Cap
    const capGeom = new THREE.SphereGeometry(0.25 * scale, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xc8a882,
      roughness: 0.65
    });
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.rotation.x = -Math.PI / 2;
    cap.scale.set(1, 0.7, 0.7);
    cap.castShadow = true;
    group.add(cap);

    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.25 * scale, 12);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0xeddcc8,
      roughness: 0.7
    });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = -0.12 * scale;
    stem.castShadow = true;
    group.add(stem);

    return group;
  }

  // Helper for cherry tomato
  function createCherryTomato(scale = 1) {
    const group = new THREE.Group();
    const tomatoGeom = new THREE.SphereGeometry(0.24 * scale, 18, 18);
    const tomatoMat = new THREE.MeshStandardMaterial({
      color: 0xd32f2f,
      roughness: 0.18,
      metalness: 0.1
    });
    const tomato = new THREE.Mesh(tomatoGeom, tomatoMat);
    tomato.castShadow = true;
    group.add(tomato);

    // Green Calyx / Stem on top
    const stemGeom = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.1 * scale, 6);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.6 });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = 0.24 * scale;
    group.add(stem);

    for (let i = 0; i < 5; i++) {
      const sepalGeom = new THREE.ConeGeometry(0.03 * scale, 0.12 * scale, 4);
      const sepal = new THREE.Mesh(sepalGeom, stemMat);
      sepal.position.set(0, 0.23 * scale, 0);
      sepal.rotation.z = Math.PI / 2.3;
      sepal.rotation.y = (i * Math.PI * 2) / 5;
      group.add(sepal);
    }
    return group;
  }

  /* ----------------- 1. PIZZA MODEL ----------------- */
  function createPizzaModel() {
    const pizza = new THREE.Group();
    pizza.name = 'pizzaModel';

    // 1. Puffy outer crust (golden brown baked ring)
    const crustGeom = new THREE.TorusGeometry(2.35, 0.38, 20, 52);
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0xd98634,
      map: crustTexture,
      roughness: 0.72,
      metalness: 0.05
    });
    const crust = new THREE.Mesh(crustGeom, crustMat);
    crust.rotation.x = Math.PI / 2;
    crust.scale.set(1, 1, 0.65);
    crust.castShadow = true;
    crust.receiveShadow = true;
    pizza.add(crust);

    // Oven baked blister spots on crust
    const blisterMat = new THREE.MeshStandardMaterial({ color: 0x6e3713, roughness: 0.8 });
    for (let i = 0; i < 14; i++) {
      const angle = (i * Math.PI * 2) / 14 + (Math.random() - 0.5) * 0.2;
      const bGeom = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 8, 8);
      const blister = new THREE.Mesh(bGeom, blisterMat);
      blister.position.set(Math.cos(angle) * 2.38, 0.12, Math.sin(angle) * 2.38);
      blister.scale.set(1.4, 0.5, 1.2);
      pizza.add(blister);
    }

    // 2. Base dough & Tomato sauce layer
    const baseGeom = new THREE.CylinderGeometry(2.3, 2.3, 0.16, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xc62828,
      roughness: 0.45,
      metalness: 0.1
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = -0.04;
    base.receiveShadow = true;
    pizza.add(base);

    // 3. Melted Mozzarella Cheese blanket
    const cheeseGeom = new THREE.CylinderGeometry(2.18, 2.18, 0.12, 48);
    const cheeseMat = new THREE.MeshStandardMaterial({
      color: 0xffd95a,
      map: cheeseTexture,
      roughness: 0.38,
      metalness: 0.12
    });
    const cheese = new THREE.Mesh(cheeseGeom, cheeseMat);
    cheese.name = 'cheeseLayer';
    cheese.position.y = 0.06;
    cheese.receiveShadow = true;
    pizza.add(cheese);

    // Melted golden spots on cheese
    const spotMat = new THREE.MeshStandardMaterial({ color: 0xdf841e, roughness: 0.6 });
    for (let i = 0; i < 16; i++) {
      const r = Math.random() * 1.7 + 0.2;
      const a = Math.random() * Math.PI * 2;
      const sGeom = new THREE.CylinderGeometry(0.12 + Math.random() * 0.14, 0.12 + Math.random() * 0.14, 0.02, 12);
      const spot = new THREE.Mesh(sGeom, spotMat);
      spot.position.set(Math.cos(a) * r, 0.122, Math.sin(a) * r);
      pizza.add(spot);
    }

    // 4. Pepperoni slices (8 pieces)
    const peppGroup = new THREE.Group();
    peppGroup.name = 'pepperoniGroup';
    const peppGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24);
    const peppMat = new THREE.MeshStandardMaterial({
      color: 0xb52222,
      roughness: 0.32,
      metalness: 0.15
    });

    const peppPositions = [
      [1.2, 0.4], [-1.1, 0.5], [0.3, 1.3], [-0.4, -1.2],
      [1.3, -0.8], [-1.3, -0.7], [0.6, -0.4], [-0.5, 0.3]
    ];
    peppPositions.forEach(([x, z], idx) => {
      const p = new THREE.Mesh(peppGeom, peppMat);
      p.position.set(x, 0.13, z);
      p.rotation.y = idx * 0.8;
      p.rotation.x = (Math.random() - 0.5) * 0.08;
      p.castShadow = true;
      p.receiveShadow = true;
      peppGroup.add(p);

      // Pepp fat specks
      const speckMat = new THREE.MeshBasicMaterial({ color: 0xe88a8a });
      for (let s = 0; s < 4; s++) {
        const sg = new THREE.SphereGeometry(0.04, 6, 6);
        const sp = new THREE.Mesh(sg, speckMat);
        const sa = Math.random() * Math.PI * 2;
        const sr = Math.random() * 0.25;
        sp.position.set(x + Math.cos(sa) * sr, 0.158, z + Math.sin(sa) * sr);
        peppGroup.add(sp);
      }
    });
    pizza.add(peppGroup);

    // 5. Fresh Basil leaves (6 pieces)
    const basilGroup = new THREE.Group();
    basilGroup.name = 'basilGroup';
    const basilPositions = [
      [0.0, 0.0, 0.3], [0.8, 1.0, -0.4], [-0.9, 1.1, 0.8],
      [1.0, -1.2, -0.7], [-1.0, -1.1, 1.2], [0.0, -0.8, 0.1]
    ];
    basilPositions.forEach(([x, z, rot]) => {
      const basil = createBasilLeaf(0.9);
      basil.position.set(x, 0.14, z);
      basil.rotation.y = rot;
      basil.rotation.z = 0.08;
      basilGroup.add(basil);
    });
    pizza.add(basilGroup);

    // 6. Black Olive rings (6 pieces)
    const oliveGroup = new THREE.Group();
    oliveGroup.name = 'oliveGroup';
    const olivePositions = [
      [1.6, 0.1], [-0.3, 1.6], [-1.5, -0.2],
      [0.5, -1.5], [-0.7, 0.8], [0.8, -0.8]
    ];
    olivePositions.forEach(([x, z]) => {
      const olive = createOliveRing(1.1);
      olive.position.set(x, 0.14, z);
      olive.rotation.z = (Math.random() - 0.5) * 0.15;
      oliveGroup.add(olive);
    });
    pizza.add(oliveGroup);

    // 7. Mushroom slices (5 pieces)
    const mushroomPositions = [
      [-0.4, 0.7], [0.7, 0.6], [0.2, -1.1], [-1.3, 0.6], [1.4, -0.4]
    ];
    mushroomPositions.forEach(([x, z]) => {
      const mushroom = createMushroomSlice(0.85);
      mushroom.position.set(x, 0.14, z);
      mushroom.rotation.y = Math.random() * Math.PI * 2;
      pizza.add(mushroom);
    });

    // Pizza slice cut line indicators
    const cutMat = new THREE.LineBasicMaterial({ color: 0x8a4014, opacity: 0.35, transparent: true });
    for (let c = 0; c < 4; c++) {
      const pts = [
        new THREE.Vector3(-Math.cos(c * Math.PI * 0.25) * 2.2, 0.125, -Math.sin(c * Math.PI * 0.25) * 2.2),
        new THREE.Vector3(Math.cos(c * Math.PI * 0.25) * 2.2, 0.125, Math.sin(c * Math.PI * 0.25) * 2.2)
      ];
      const cutGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(cutGeom, cutMat);
      pizza.add(line);
    }

    pizza.rotation.x = 0.45;
    return pizza;
  }

  /* ----------------- 2. BURGER MODEL ----------------- */
  function createBurgerModel() {
    const burger = new THREE.Group();
    burger.name = 'burgerModel';

    // 1. Bottom Bun
    const bBunGeom = new THREE.CylinderGeometry(2.1, 1.85, 0.55, 36);
    const bunMat = new THREE.MeshStandardMaterial({
      color: 0xdf943f,
      map: crustTexture,
      roughness: 0.65,
      metalness: 0.05
    });
    const bottomBun = new THREE.Mesh(bBunGeom, bunMat);
    bottomBun.position.y = -1.1;
    bottomBun.castShadow = true;
    bottomBun.receiveShadow = true;
    burger.add(bottomBun);

    // 2. Juicy Grilled Patty
    const pattyGeom = new THREE.CylinderGeometry(2.2, 2.25, 0.65, 36);
    const pattyMat = new THREE.MeshStandardMaterial({
      color: 0x482414,
      map: pattyTexture,
      roughness: 0.78,
      metalness: 0.1
    });
    const patty = new THREE.Mesh(pattyGeom, pattyMat);
    patty.name = 'mainPatty';
    patty.position.y = -0.55;
    patty.castShadow = true;
    patty.receiveShadow = true;
    burger.add(patty);

    // 3. Melted Cheddar Cheese Slice with 4 drooping corners
    const cheeseShape = new THREE.Shape();
    const sz = 2.4;
    cheeseShape.moveTo(-sz, -sz);
    cheeseShape.lineTo(sz, -sz);
    cheeseShape.lineTo(sz, sz);
    cheeseShape.lineTo(-sz, sz);
    cheeseShape.closePath();

    const cheeseGeom = new THREE.ExtrudeGeometry(cheeseShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06
    });

    const cPos = cheeseGeom.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i);
      const y = cPos.getY(i);
      const distFromCenter = Math.sqrt(x * x + y * y);
      if (distFromCenter > 2.0) {
        cPos.setZ(i, cPos.getZ(i) - (distFromCenter - 2.0) * 0.9);
      }
    }
    cheeseGeom.computeVertexNormals();
    cPos.needsUpdate = true;

    const cheeseMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.32,
      metalness: 0.15
    });
    const cheese = new THREE.Mesh(cheeseGeom, cheeseMat);
    cheese.name = 'burgerCheese';
    cheese.rotation.x = Math.PI / 2;
    cheese.rotation.z = Math.PI / 4;
    cheese.position.y = -0.15;
    cheese.castShadow = true;
    burger.add(cheese);

    // 4. Tomato Slices (2 thick juicy slices side-by-side)
    const tomatoMat = new THREE.MeshStandardMaterial({
      color: 0xd32f2f,
      roughness: 0.22,
      metalness: 0.12
    });
    const tomGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.22, 28);
    const tom1 = new THREE.Mesh(tomGeom, tomatoMat);
    tom1.position.set(-0.65, 0.08, 0.2);
    tom1.rotation.z = 0.08;
    tom1.castShadow = true;
    burger.add(tom1);

    const tom2 = new THREE.Mesh(tomGeom, tomatoMat);
    tom2.position.set(0.7, 0.1, -0.2);
    tom2.rotation.z = -0.06;
    tom2.castShadow = true;
    burger.add(tom2);

    // 5. Crispy Ruffled Green Lettuce
    const lettuceGroup = new THREE.Group();
    const lettuceMat = new THREE.MeshStandardMaterial({
      color: 0x689f38,
      roughness: 0.5,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const segments = 32;
    for (let i = 0; i < segments; i++) {
      const angle = (i * Math.PI * 2) / segments;
      const rOuter = 2.4 + Math.sin(i * 3.5) * 0.35;
      const petalGeom = new THREE.PlaneGeometry(0.7, 0.6, 4, 4);
      const ppos = petalGeom.attributes.position;
      for (let j = 0; j < ppos.count; j++) {
        ppos.setZ(j, Math.sin(ppos.getX(j) * 5) * 0.1);
      }
      petalGeom.computeVertexNormals();
      ppos.needsUpdate = true;

      const petal = new THREE.Mesh(petalGeom, lettuceMat);
      petal.position.set(Math.cos(angle) * rOuter, 0.26 + Math.sin(i * 2) * 0.06, Math.sin(angle) * rOuter);
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.x = Math.PI / 2.8;
      petal.castShadow = true;
      lettuceGroup.add(petal);
    }
    burger.add(lettuceGroup);

    // Purple Onion Rings
    const onionMat = new THREE.MeshStandardMaterial({ color: 0x8e24aa, roughness: 0.35 });
    const onionGeom = new THREE.TorusGeometry(1.3, 0.09, 8, 24);
    const onion1 = new THREE.Mesh(onionGeom, onionMat);
    onion1.rotation.x = Math.PI / 2.2;
    onion1.position.set(0.1, 0.32, 0.1);
    burger.add(onion1);

    // 6. Top Brioche Bun Crown (smooth golden dome)
    const topBunGeom = new THREE.SphereGeometry(2.35, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const topBunMat = new THREE.MeshStandardMaterial({
      color: 0xe5973b,
      map: crustTexture,
      roughness: 0.45,
      metalness: 0.08
    });
    const topBun = new THREE.Mesh(topBunGeom, topBunMat);
    topBun.position.y = 0.38;
    topBun.scale.set(1, 0.72, 1);
    topBun.castShadow = true;
    burger.add(topBun);

    // Bun bottom rim lip
    const bunRimGeom = new THREE.TorusGeometry(2.32, 0.18, 12, 36);
    const bunRim = new THREE.Mesh(bunRimGeom, topBunMat);
    bunRim.rotation.x = Math.PI / 2;
    bunRim.position.y = 0.38;
    burger.add(bunRim);

    // 7. 3D White Sesame Seeds (50+ real 3D seeds scattered across bun)
    const seedGeom = new THREE.SphereGeometry(0.045, 8, 8);
    seedGeom.scale(1, 0.45, 2.2);
    const seedMat = new THREE.MeshStandardMaterial({
      color: 0xfff6dc,
      roughness: 0.4
    });

    for (let i = 0; i < 50; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * 0.9 + 0.15;
      const r = 2.37;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const z = r * Math.sin(phi) * Math.sin(theta);
      const y = r * Math.cos(phi) * 0.72 + 0.38;

      const seed = new THREE.Mesh(seedGeom, seedMat);
      seed.position.set(x, y, z);
      seed.lookAt(x * 1.5, y + 0.5, z * 1.5);
      burger.add(seed);
    }

    burger.rotation.x = 0.28;
    return burger;
  }

  /* ----------------- 3. PASTA MODEL ----------------- */
  function createPastaModel() {
    const pasta = new THREE.Group();
    pasta.name = 'pastaModel';

    // 1. Ceramic Pasta Bowl
    const bowlOuterGeom = new THREE.CylinderGeometry(2.6, 1.4, 1.2, 40);
    const bowlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.05
    });
    const bowl = new THREE.Mesh(bowlOuterGeom, bowlMat);
    bowl.position.y = -0.6;
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    pasta.add(bowl);

    // Bowl rim
    const rimGeom = new THREE.TorusGeometry(2.6, 0.16, 16, 40);
    const rim = new THREE.Mesh(rimGeom, bowlMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.0;
    pasta.add(rim);

    // Bowl Inner Well
    const innerGeom = new THREE.CylinderGeometry(2.45, 1.25, 1.05, 36);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.3 });
    const inner = new THREE.Mesh(innerGeom, innerMat);
    inner.position.y = -0.48;
    inner.receiveShadow = true;
    pasta.add(inner);

    // 2. Swirled Fettuccine / Tagliatelle Pasta Nest (Procedural 3D spline tubes)
    const noodleMat = new THREE.MeshStandardMaterial({
      color: 0xf6c858,
      roughness: 0.45,
      metalness: 0.08
    });

    for (let c = 0; c < 5; c++) {
      const curvePoints = [];
      const coilRadius = 0.5 + c * 0.35;
      const heightBase = -0.25 + c * 0.09;
      const turns = 2.5 + c * 0.5;
      const count = 35;

      for (let i = 0; i <= count; i++) {
        const t = (i / count) * Math.PI * 2 * turns;
        const r = coilRadius + Math.sin(t * 2.5) * 0.25 + (Math.random() - 0.5) * 0.1;
        const x = Math.cos(t + c * 1.3) * r;
        const z = Math.sin(t + c * 1.3) * r;
        const y = heightBase + (i / count) * 0.35 + Math.sin(t * 3) * 0.08;
        curvePoints.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const tubeGeom = new THREE.TubeGeometry(curve, 64, 0.09, 8, false);
      const tube = new THREE.Mesh(tubeGeom, noodleMat);
      tube.castShadow = true;
      tube.receiveShadow = true;
      pasta.add(tube);
    }

    // 3. Rich Tomato Marinara Sauce Dollop
    const sauceGeom = new THREE.SphereGeometry(1.0, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const sauceMat = new THREE.MeshStandardMaterial({
      color: 0xb71c1c,
      roughness: 0.25,
      metalness: 0.15
    });
    const sauce = new THREE.Mesh(sauceGeom, sauceMat);
    sauce.name = 'marinaraSauce';
    sauce.position.y = 0.15;
    sauce.scale.set(1.2, 0.45, 1.2);
    sauce.castShadow = true;
    pasta.add(sauce);

    // Smaller sauce dollops
    for (let s = 0; s < 6; s++) {
      const angle = (s * Math.PI * 2) / 6;
      const sg = new THREE.SphereGeometry(0.35 + Math.random() * 0.2, 12, 10);
      const sm = new THREE.Mesh(sg, sauceMat);
      sm.position.set(Math.cos(angle) * 0.9, 0.12, Math.sin(angle) * 0.9);
      sm.scale.set(1, 0.4, 1);
      pasta.add(sm);
    }

    // 4. Parmesan Cheese Flakes (18 delicate shavings scattered)
    const parmGroup = new THREE.Group();
    parmGroup.name = 'parmGroup';
    const parmMat = new THREE.MeshStandardMaterial({
      color: 0xfffde7,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    for (let p = 0; p < 18; p++) {
      const flakeGeom = new THREE.PlaneGeometry(0.18 + Math.random() * 0.15, 0.09 + Math.random() * 0.06);
      const flake = new THREE.Mesh(flakeGeom, parmMat);
      const fr = Math.random() * 1.3;
      const fa = Math.random() * Math.PI * 2;
      flake.position.set(Math.cos(fa) * fr, 0.28 + Math.random() * 0.12, Math.sin(fa) * fr);
      flake.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      parmGroup.add(flake);
    }
    pasta.add(parmGroup);

    // 5. Fresh Basil leaves on crown
    const b1 = createBasilLeaf(1.1);
    b1.position.set(-0.25, 0.42, 0.1);
    b1.rotation.y = 0.4;
    b1.rotation.x = -0.3;
    pasta.add(b1);

    const b2 = createBasilLeaf(0.95);
    b2.position.set(0.3, 0.4, -0.15);
    b2.rotation.y = -0.8;
    b2.rotation.x = -0.2;
    pasta.add(b2);

    // 6. Cherry Tomatoes nestled on side
    const tom1 = createCherryTomato(0.9);
    tom1.position.set(1.1, 0.18, 0.6);
    pasta.add(tom1);

    const tom2 = createCherryTomato(0.8);
    tom2.position.set(-1.0, 0.15, -0.7);
    pasta.add(tom2);

    pasta.rotation.x = 0.48;
    return pasta;
  }

  /* ----------------- 4. SANDWICH MODEL ----------------- */
  function createSandwichModel() {
    const sandwich = new THREE.Group();
    sandwich.name = 'sandwichModel';

    const grillTexture = createGrillTexture('#f6ddbe', '#733f11');
    function createBreadSlice(isTop = false) {
      const shape = new THREE.Shape();
      const w = 1.9, l = 1.6;
      shape.moveTo(-w, -l);
      shape.lineTo(w, -l);
      shape.quadraticCurveTo(w + 0.25, 0, w, l);
      shape.lineTo(-w, l);
      shape.quadraticCurveTo(-w - 0.25, 0, -w, -l);
      shape.closePath();

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.34,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.12,
        bevelThickness: 0.12
      });

      const breadMat = new THREE.MeshStandardMaterial({
        color: 0xf5dfc4,
        map: isTop ? grillTexture : crustTexture,
        roughness: 0.6,
        metalness: 0.05
      });
      const slice = new THREE.Mesh(geom, breadMat);
      slice.rotation.x = Math.PI / 2;
      slice.castShadow = true;
      slice.receiveShadow = true;
      return slice;
    }

    // 1. Bottom Bread Slice
    const bottomBread = createBreadSlice(false);
    bottomBread.position.y = -0.85;
    sandwich.add(bottomBread);

    // 2. Crispy Lettuce Leaf
    const lettuceMat = new THREE.MeshStandardMaterial({
      color: 0x7cb342,
      roughness: 0.5,
      side: THREE.DoubleSide
    });
    for (let i = 0; i < 18; i++) {
      const lp = new THREE.PlaneGeometry(0.8, 0.5);
      const lm = new THREE.Mesh(lp, lettuceMat);
      const angle = (i * Math.PI * 2) / 18;
      lm.position.set(Math.cos(angle) * 2.05, -0.48, Math.sin(angle) * 1.75);
      lm.rotation.y = -angle;
      lm.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      sandwich.add(lm);
    }

    // 3. Savory Sliced Ham / Deli Meats
    const hamMat = new THREE.MeshStandardMaterial({
      color: 0xd87b87,
      roughness: 0.45,
      metalness: 0.1
    });
    const hamGeom = new THREE.BoxGeometry(3.6, 0.18, 3.0);
    const ham1 = new THREE.Mesh(hamGeom, hamMat);
    ham1.position.y = -0.32;
    ham1.rotation.y = 0.05;
    ham1.castShadow = true;
    sandwich.add(ham1);

    // 4. Sharp Cheddar Cheese Layer
    const cheeseMat = new THREE.MeshStandardMaterial({
      color: 0xffb300,
      roughness: 0.35,
      metalness: 0.12
    });
    const cheeseGeom = new THREE.BoxGeometry(3.7, 0.12, 3.2);
    const cheese = new THREE.Mesh(cheeseGeom, cheeseMat);
    cheese.name = 'sandwichCheese';
    cheese.position.y = -0.12;
    cheese.rotation.y = 0.22;
    cheese.castShadow = true;
    sandwich.add(cheese);

    // 5. Fresh Red Tomato Slices
    const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.25 });
    const tomGeom = new THREE.CylinderGeometry(1.05, 1.05, 0.2, 24);
    const t1 = new THREE.Mesh(tomGeom, tomatoMat);
    t1.position.set(-0.85, 0.08, 0.25);
    t1.rotation.z = 0.06;
    sandwich.add(t1);

    const t2 = new THREE.Mesh(tomGeom, tomatoMat);
    t2.position.set(0.85, 0.08, -0.25);
    t2.rotation.z = -0.06;
    sandwich.add(t2);

    // 6. Crispy Bacon Strips
    const baconGroup = new THREE.Group();
    baconGroup.name = 'baconGroup';
    const baconMat = new THREE.MeshStandardMaterial({ color: 0x8d291e, roughness: 0.5 });
    for (let b = 0; b < 2; b++) {
      const baconGeom = new THREE.BoxGeometry(3.5, 0.08, 0.65);
      const bacon = new THREE.Mesh(baconGeom, baconMat);
      bacon.position.set(0, 0.24, (b - 0.5) * 1.3);
      bacon.rotation.y = (b - 0.5) * 0.25;
      baconGroup.add(bacon);
    }
    sandwich.add(baconGroup);

    // 7. Top Bread Slice with Grill Marks
    const topBread = createBreadSlice(true);
    topBread.position.y = 0.42;
    sandwich.add(topBread);

    // 8. Bamboo Skewer with Olive on Top
    const skewerMat = new THREE.MeshStandardMaterial({ color: 0xd7ba8d, roughness: 0.7 });
    const skewerGeom = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 10);
    const skewer = new THREE.Mesh(skewerGeom, skewerMat);
    skewer.position.set(0.7, 1.1, 0.3);
    skewer.rotation.z = -0.12;
    sandwich.add(skewer);

    // Spanish Green Olive on toothpick
    const oliveMat = new THREE.MeshStandardMaterial({ color: 0x687834, roughness: 0.35 });
    const oliveGeom = new THREE.SphereGeometry(0.24, 16, 16);
    oliveGeom.scale(1, 1.3, 1);
    const olive = new THREE.Mesh(oliveGeom, oliveMat);
    olive.position.set(0.78, 1.85, 0.3);
    sandwich.add(olive);

    // Red pimento center
    const pimentoMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3 });
    const pimGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12);
    const pimento = new THREE.Mesh(pimGeom, pimentoMat);
    pimento.position.set(0.78, 2.05, 0.3);
    sandwich.add(pimento);

    sandwich.rotation.x = 0.38;
    sandwich.rotation.y = -0.25;
    return sandwich;
  }

  /* ==========================================================================
     3. 3D STEAM PARTICLE SYSTEM
     ========================================================================== */
  function createSteamParticles(count = 35) {
    const group = new THREE.Group();
    const particles = [];

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const steamTexture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.SpriteMaterial({
      map: steamTexture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(mat);
      const r = Math.random() * 1.5;
      const a = Math.random() * Math.PI * 2;
      sprite.position.set(Math.cos(a) * r, 0.5 + Math.random() * 2.5, Math.sin(a) * r);
      const s = 0.4 + Math.random() * 0.6;
      sprite.scale.set(s, s, s);
      sprite.userData = {
        speedY: 0.012 + Math.random() * 0.016,
        driftX: (Math.random() - 0.5) * 0.005,
        driftZ: (Math.random() - 0.5) * 0.005,
        initY: 0.5,
        maxY: 3.5,
        baseScale: s
      };
      group.add(sprite);
      particles.push(sprite);
    }

    group.update = function () {
      particles.forEach(p => {
        p.position.y += p.userData.speedY;
        p.position.x += p.userData.driftX;
        p.position.z += p.userData.driftZ;
        const progress = (p.position.y - p.userData.initY) / (p.userData.maxY - p.userData.initY);
        p.material.opacity = Math.sin(progress * Math.PI) * 0.35;
        const sc = p.userData.baseScale * (1 + progress * 1.5);
        p.scale.set(sc, sc, sc);

        if (p.position.y > p.userData.maxY) {
          p.position.y = p.userData.initY;
          const r = Math.random() * 1.2;
          const a = Math.random() * Math.PI * 2;
          p.position.x = Math.cos(a) * r;
          p.position.z = Math.sin(a) * r;
        }
      });
    };

    return group;
  }

  /* ==========================================================================
     4. HERO 3D WEBGL STAGE CONTROLLER
     ========================================================================== */
  class Hero3DStage {
    constructor() {
      this.container = document.querySelector('#home .stage');
      if (!this.container) return;

      this.currentDishIndex = 0;
      this.isDragging = false;
      this.autoRotate = true;
      this.prevMouse = { x: 0, y: 0 };
      this.targetRotation = { x: 0.3, y: 0 };
      this.currentRotation = { x: 0.3, y: 0 };
      this.targetZoom = 1.0;
      this.currentZoom = 1.0;

      this.initScene();
      this.buildDishes();
      this.setupControlsUI();
      this.bindEvents();
      this.animate();
    }

    initScene() {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'hero-3d-canvas';
      this.canvas.className = 'hero-3d-stage';
      this.container.appendChild(this.canvas);

      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.scene = new THREE.Scene();

      const fov = width < 768 ? 52 : 42;
      this.camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100);
      this.camera.position.set(0, 3.2, 7.8);
      this.camera.lookAt(0, 0, 0);

      this.ambientLight = new THREE.AmbientLight(0xfff8f0, 1.2);
      this.scene.add(this.ambientLight);

      this.keyLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
      this.keyLight.position.set(4, 9, 6);
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 25;
      this.keyLight.shadow.bias = -0.001;
      this.scene.add(this.keyLight);

      this.rimLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
      this.rimLight.position.set(-6, 4, -4);
      this.scene.add(this.rimLight);

      this.fillLight = new THREE.DirectionalLight(0xffedd5, 0.6);
      this.fillLight.position.set(0, -5, 4);
      this.scene.add(this.fillLight);

      // Floor shadow
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 256;
      shadowCanvas.height = 256;
      const sctx = shadowCanvas.getContext('2d');
      const grad = sctx.createRadialGradient(128, 128, 0, 128, 128, 120);
      grad.addColorStop(0, 'rgba(40, 20, 30, 0.45)');
      grad.addColorStop(0.5, 'rgba(40, 20, 30, 0.18)');
      grad.addColorStop(1, 'rgba(40, 20, 30, 0)');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 256, 256);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);

      const shadowGeom = new THREE.PlaneGeometry(6.4, 6.4);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      });
      this.floorShadow = new THREE.Mesh(shadowGeom, shadowMat);
      this.floorShadow.rotation.x = -Math.PI / 2;
      this.floorShadow.position.y = -1.6;
      this.scene.add(this.floorShadow);

      this.steam = createSteamParticles(30);
      this.scene.add(this.steam);

      this.createFloatingGarnish();
    }

    createFloatingGarnish() {
      this.garnishGroup = new THREE.Group();
      const items = [
        { mesh: createCherryTomato(0.65), pos: [-3.4, 1.2, -1.0], rotSpeed: [0.01, 0.015, 0] },
        { mesh: createBasilLeaf(0.8), pos: [3.2, 1.8, -0.5], rotSpeed: [0.012, 0.02, 0.01] },
        { mesh: createOliveRing(0.85), pos: [-2.8, -1.0, 1.2], rotSpeed: [0.02, 0.01, 0.015] },
        { mesh: createMushroomSlice(0.7), pos: [3.4, -0.8, 0.8], rotSpeed: [0.015, 0.012, 0.01] },
        { mesh: createCherryTomato(0.5), pos: [2.2, 2.5, -2.0], rotSpeed: [0.01, 0.01, 0.02] }
      ];

      items.forEach(it => {
        it.mesh.position.set(...it.pos);
        it.mesh.userData = it;
        this.garnishGroup.add(it.mesh);
      });
      this.scene.add(this.garnishGroup);
    }

    buildDishes() {
      this.dishGroup = new THREE.Group();
      this.scene.add(this.dishGroup);

      this.dishes = [
        createPizzaModel(),
        createBurgerModel(),
        createPastaModel(),
        createSandwichModel()
      ];

      this.dishes.forEach((d, idx) => {
        d.visible = (idx === 0);
        d.scale.set(1, 1, 1);
        this.dishGroup.add(d);
      });
    }

    setupControlsUI() {
      const controls = document.createElement('div');
      controls.className = 'hero-3d-toolbar';
      controls.innerHTML = `
        <div class="hero-3d-badge">
          <span class="badge-dot"></span>
          <span>3D Interactive Stage</span>
        </div>
        <div class="hero-3d-actions">
          <button type="button" class="btn-3d-tool" id="btn-3d-rotate" title="Toggle Auto-Spin" aria-label="Toggle Auto-Spin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span class="btn-text">Spin</span>
          </button>
          <button type="button" class="btn-3d-tool" id="btn-3d-zoomin" title="Zoom In" aria-label="Zoom In">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button type="button" class="btn-3d-tool" id="btn-3d-zoomout" title="Zoom Out" aria-label="Zoom Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button type="button" class="btn-3d-tool" id="btn-3d-reset" title="Reset View" aria-label="Reset View">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
          <button type="button" class="btn-3d-tool btn-3d-inspect" id="btn-3d-inspect" title="Inspect Dish in 3D" aria-label="Inspect Dish in 3D">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span class="btn-text">Customize 3D</span>
          </button>
        </div>
        <div class="hero-3d-hint">👆 Drag to rotate 360° • Pinch / Scroll to zoom</div>
      `;
      this.container.appendChild(controls);

      const rotateBtn = controls.querySelector('#btn-3d-rotate');
      rotateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.autoRotate = !this.autoRotate;
        rotateBtn.classList.toggle('active', this.autoRotate);
      });
      rotateBtn.classList.add('active');

      controls.querySelector('#btn-3d-zoomin').addEventListener('click', (e) => {
        e.stopPropagation();
        this.targetZoom = Math.min(1.6, this.targetZoom + 0.15);
      });

      controls.querySelector('#btn-3d-zoomout').addEventListener('click', (e) => {
        e.stopPropagation();
        this.targetZoom = Math.max(0.65, this.targetZoom - 0.15);
      });

      controls.querySelector('#btn-3d-reset').addEventListener('click', (e) => {
        e.stopPropagation();
        this.targetRotation.x = 0.3;
        this.targetRotation.y = 0;
        this.targetZoom = 1.0;
      });

      controls.querySelector('#btn-3d-inspect').addEventListener('click', (e) => {
        e.stopPropagation();
        window.DishInspectorModal && window.DishInspectorModal.open(this.currentDishIndex);
      });
    }

    bindEvents() {
      const onPointerDown = (e) => {
        this.isDragging = true;
        this.prevMouse.x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        this.prevMouse.y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
        if (e.stopPropagation) e.stopPropagation();
      };

      const onPointerMove = (e) => {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        if (this.isDragging) {
          const deltaX = clientX - this.prevMouse.x;
          const deltaY = clientY - this.prevMouse.y;
          this.targetRotation.y += deltaX * 0.008;
          this.targetRotation.x = Math.max(-0.2, Math.min(0.9, this.targetRotation.x + deltaY * 0.006));
          this.prevMouse.x = clientX;
          this.prevMouse.y = clientY;
          this.autoRotate = false;
          const rotBtn = document.querySelector('#btn-3d-rotate');
          if (rotBtn) rotBtn.classList.remove('active');
        } else {
          const rect = this.canvas.getBoundingClientRect();
          const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
          const normY = -(((clientY - rect.top) / rect.height) * 2 - 1);
          if (this.garnishGroup) {
            this.garnishGroup.position.x = normX * 0.4;
            this.garnishGroup.position.y = normY * 0.3;
          }
        }
      };

      const onPointerUp = () => {
        this.isDragging = false;
      };

      this.canvas.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      this.canvas.addEventListener('touchstart', onPointerDown, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.targetZoom = Math.max(0.65, Math.min(1.6, this.targetZoom - e.deltaY * 0.0012));
      }, { passive: false });

      window.addEventListener('resize', () => this.onResize());

      window.addEventListener('dishChange', (e) => {
        if (typeof e.detail === 'number') {
          this.switchDish(e.detail);
        }
      });
    }

    switchDish(newIndex) {
      if (newIndex === this.currentDishIndex || !this.dishes[newIndex]) return;

      const oldDish = this.dishes[this.currentDishIndex];
      const newDish = this.dishes[newIndex];
      this.currentDishIndex = newIndex;

      const duration = 750;
      const startTime = performance.now();
      const startRotY = this.dishGroup.rotation.y;
      const targetRotY = startRotY + Math.PI * 1.5;

      newDish.visible = true;
      newDish.position.y = 1.8;
      newDish.scale.set(0.01, 0.01, 0.01);

      const step = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const ease = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);

        this.dishGroup.rotation.y = startRotY + (targetRotY - startRotY) * progress;

        oldDish.scale.setScalar(Math.max(0.01, 1 - progress * 1.2));
        oldDish.position.y = -progress * 1.5;

        newDish.scale.setScalar(Math.max(0.01, Math.min(1, ease)));
        newDish.position.y = 1.8 * (1 - progress);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          oldDish.visible = false;
          oldDish.position.y = 0;
          oldDish.scale.set(1, 1, 1);
          newDish.position.y = 0;
          newDish.scale.set(1, 1, 1);
        }
      };
      requestAnimationFrame(step);
    }

    onResize() {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.fov = width < 768 ? 52 : 42;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      if (this.autoRotate && !this.isDragging) {
        this.targetRotation.y += 0.007;
      }

      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.08;
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.08;
      this.currentZoom += (this.targetZoom - this.currentZoom) * 0.08;

      this.dishGroup.rotation.x = this.currentRotation.x;
      this.dishGroup.rotation.y = this.currentRotation.y;
      this.dishGroup.scale.setScalar(this.currentZoom);

      const time = performance.now() * 0.0015;
      this.dishGroup.position.y = Math.sin(time) * 0.08;
      this.floorShadow.scale.setScalar(1 + Math.sin(time) * 0.06);

      if (this.steam) this.steam.update();

      if (this.garnishGroup) {
        this.garnishGroup.children.forEach((mesh, idx) => {
          mesh.rotation.x += mesh.userData.rotSpeed[0];
          mesh.rotation.y += mesh.userData.rotSpeed[1];
          mesh.rotation.z += mesh.userData.rotSpeed[2];
          mesh.position.y = mesh.userData.pos[1] + Math.sin(time * 1.5 + idx) * 0.15;
        });
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  /* ==========================================================================
     5. 3D DISH INSPECTOR & CUSTOMIZER MODAL
     ========================================================================= */
  class DishInspectorModal {
    constructor() {
      this.modal = null;
      this.currentDishIndex = 0;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.activeModel = null;
      this.initModalHTML();
    }

    initModalHTML() {
      this.modal = document.createElement('div');
      this.modal.id = 'dish-3d-modal';
      this.modal.className = 'modal-3d-backdrop';
      this.modal.innerHTML = `
        <div class="modal-3d-dialog">
          <button type="button" class="modal-3d-close" aria-label="Close modal">&times;</button>
          
          <div class="modal-3d-grid">
            <div class="modal-3d-canvas-wrap">
              <canvas id="modal-3d-canvas"></canvas>
              <div class="canvas-3d-hint">👆 Drag to inspect 360° • Scroll to zoom</div>
            </div>

            <div class="modal-3d-sidebar">
              <div class="modal-tag">Interactive 3D Kitchen</div>
              <h2 id="modal-dish-title">Artisan Pizza</h2>
              <p id="modal-dish-desc">Hand-tossed Italian crust topped with rich vine-ripened marinara, creamy buffalo mozzarella, and fresh basil.</p>
              
              <div class="dish-specs">
                <div class="spec-chip">🔥 <b>Fresh Baked</b> 450°C Stone Oven</div>
                <div class="spec-chip">🌿 <b>Organic</b> 100% Farm Sourced</div>
              </div>

              <div class="topping-customizer">
                <h4>Customize 3D Ingredients</h4>
                <div class="topping-options" id="topping-list"></div>
              </div>

              <div class="modal-price-bar">
                <div>
                  <span class="price-label">Total Price</span>
                  <span class="price-val" id="modal-dish-price">₹199</span>
                </div>
                <button type="button" class="btn-order-modal" id="btn-order-modal">Order Now</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(this.modal);

      this.modal.querySelector('.modal-3d-close').addEventListener('click', () => this.close());
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });

      this.modal.querySelector('#btn-order-modal').addEventListener('click', () => {
        this.close();
        window.OrderSystem && window.OrderSystem.triggerCelebration();
      });

      this.initCanvas();
    }

    initCanvas() {
      const canvas = this.modal.querySelector('#modal-3d-canvas');
      this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      this.renderer.setSize(480, 420);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(40, 480 / 420, 0.1, 50);
      this.camera.position.set(0, 3.5, 7.5);
      this.camera.lookAt(0, 0, 0);

      const amb = new THREE.AmbientLight(0xfff8f0, 1.4);
      this.scene.add(amb);

      const key = new THREE.DirectionalLight(0xfff4e6, 2.0);
      key.position.set(5, 8, 6);
      key.castShadow = true;
      this.scene.add(key);

      const rim = new THREE.DirectionalLight(0xdbeafe, 1.2);
      rim.position.set(-5, 4, -4);
      this.scene.add(rim);

      let isDragging = false;
      let prevX = 0, prevY = 0;
      let rotX = 0.35, rotY = 0;

      canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging || !this.activeModel) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        rotY += dx * 0.01;
        rotX = Math.max(-0.2, Math.min(0.9, rotX + dy * 0.008));
        this.activeModel.rotation.y = rotY;
        this.activeModel.rotation.x = rotX;
        prevX = e.clientX;
        prevY = e.clientY;
      });

      window.addEventListener('mouseup', () => { isDragging = false; });

      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          isDragging = true;
          prevX = e.touches[0].clientX;
          prevY = e.touches[0].clientY;
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isDragging || !this.activeModel || !e.touches.length) return;
        const dx = e.touches[0].clientX - prevX;
        const dy = e.touches[0].clientY - prevY;
        rotY += dx * 0.012;
        rotX = Math.max(-0.2, Math.min(0.9, rotX + dy * 0.01));
        this.activeModel.rotation.y = rotY;
        this.activeModel.rotation.x = rotX;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      }, { passive: true });

      window.addEventListener('touchend', () => { isDragging = false; });

      const animate = () => {
        if (this.modal.classList.contains('active')) {
          if (!isDragging && this.activeModel) {
            this.activeModel.rotation.y += 0.006;
          }
          this.renderer.render(this.scene, this.camera);
        }
        requestAnimationFrame(animate);
      };
      animate();
    }

    open(dishIndex = 0) {
      this.currentDishIndex = dishIndex;
      const DISH_INFO = [
        {
          title: 'Artisan Woodfired Pizza',
          desc: 'Authentic stone-oven baked pizza with hand-stretched crust, signature vine-ripened tomato marinara, melted Italian buffalo mozzarella, and fresh garden basil leaves.',
          basePrice: 199,
          toppings: [
            { name: 'Extra Cheese', cost: 30, target: 'cheeseLayer' },
            { name: 'Spicy Pepperoni', cost: 45, target: 'pepperoniGroup' },
            { name: 'Black Olives', cost: 25, target: 'oliveGroup' },
            { name: 'Fresh Basil', cost: 15, target: 'basilGroup' }
          ],
          builder: createPizzaModel
        },
        {
          title: 'Gourmet Double Brioche Burger',
          desc: 'Succulent grilled beef patty seared to perfection, draped with melted Wisconsin cheddar, crisp wavy lettuce, juicy farm tomatoes, and roasted sesame seed brioche.',
          basePrice: 149,
          toppings: [
            { name: 'Extra Melted Cheddar', cost: 30, target: 'burgerCheese' },
            { name: 'Extra Beef Patty', cost: 60, target: 'mainPatty' },
            { name: 'Crispy Bacon', cost: 40, target: 'bacon' },
            { name: 'Fresh Lettuce & Tomato', cost: 20, target: 'lettuce' }
          ],
          builder: createBurgerModel
        },
        {
          title: 'Creamy Italian Fettuccine Pasta',
          desc: 'Artisanal egg pasta spirals tossed in rich velvety sauce, finished with shaved aged Parmigiano-Reggiano, heirloom cherry tomatoes, and aromatic sweet basil.',
          basePrice: 179,
          toppings: [
            { name: 'Shaved Parmesan Flakes', cost: 35, target: 'parmGroup' },
            { name: 'Extra Marinara Sauce', cost: 25, target: 'marinaraSauce' },
            { name: 'Fresh Basil Sprig', cost: 15, target: 'basil' },
            { name: 'Cherry Tomatoes', cost: 20, target: 'tomatoes' }
          ],
          builder: createPastaModel
        },
        {
          title: 'Signature Grilled Club Sandwich',
          desc: 'Triple-decker artisan toasted bread layered with tender savory meats, melted cheddar, crisp romaine lettuce, heirloom tomatoes, and garnished with stuffed Spanish olive.',
          basePrice: 99,
          toppings: [
            { name: 'Sharp Cheddar Slice', cost: 25, target: 'sandwichCheese' },
            { name: 'Crispy Bacon Strips', cost: 35, target: 'baconGroup' },
            { name: 'Extra Deli Ham', cost: 30, target: 'ham' },
            { name: 'Green Olive Garnish', cost: 15, target: 'olive' }
          ],
          builder: createSandwichModel
        }
      ];

      const info = DISH_INFO[dishIndex] || DISH_INFO[0];
      this.modal.querySelector('#modal-dish-title').textContent = info.title;
      this.modal.querySelector('#modal-dish-desc').textContent = info.desc;

      let currentTotal = info.basePrice;
      const updatePrice = () => {
        this.modal.querySelector('#modal-dish-price').textContent = `₹${currentTotal}`;
      };
      updatePrice();

      const list = this.modal.querySelector('#topping-list');
      list.innerHTML = '';

      info.toppings.forEach((top, idx) => {
        const item = document.createElement('label');
        item.className = 'topping-item';
        item.innerHTML = `
          <input type="checkbox" checked data-cost="${top.cost}" data-target="${top.target}">
          <span class="chk-box"></span>
          <span>${top.name} (+₹${top.cost})</span>
        `;

        const chk = item.querySelector('input');
        chk.addEventListener('change', () => {
          if (chk.checked) {
            currentTotal += top.cost;
          } else {
            currentTotal -= top.cost;
          }
          updatePrice();

          // Live 3D model update
          if (this.activeModel) {
            const part = this.activeModel.getObjectByName(top.target);
            if (part) {
              part.visible = chk.checked;
            }
          }
        });

        list.appendChild(item);
      });

      if (this.activeModel) {
        this.scene.remove(this.activeModel);
      }

      this.activeModel = info.builder();
      this.activeModel.position.set(0, 0, 0);
      this.activeModel.scale.set(0.9, 0.9, 0.9);
      this.scene.add(this.activeModel);

      this.modal.classList.add('active');
    }

    close() {
      this.modal.classList.remove('active');
    }
  }

  /* ==========================================================================
     6. 3D CARD TILT & SPECULAR GLARE SYSTEM
     ========================================================================== */
  function init3DCardTilt() {
    const cards = document.querySelectorAll('.card, .offer, .contact-box, .chips li');

    cards.forEach(card => {
      const shine = document.createElement('div');
      shine.className = 'card-3d-shine';
      card.appendChild(shine);

      let bounds;
      const onMouseEnter = () => {
        bounds = card.getBoundingClientRect();
        card.classList.add('is-tilting');
      };

      const onMouseMove = (e) => {
        if (!bounds) bounds = card.getBoundingClientRect();
        const mouseX = e.clientX - bounds.left;
        const mouseY = e.clientY - bounds.top;

        const xPct = mouseX / bounds.width - 0.5;
        const yPct = mouseY / bounds.height - 0.5;

        const rotateX = -yPct * 18;
        const rotateY = xPct * 18;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;

        shine.style.background = `radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 70%)`;
      };

      const onMouseLeave = () => {
        card.classList.remove('is-tilting');
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        shine.style.background = 'none';
      };

      card.addEventListener('mouseenter', onMouseEnter);
      card.addEventListener('mousemove', onMouseMove);
      card.addEventListener('mouseleave', onMouseLeave);
    });
  }

  /* ==========================================================================
     7. 3D ORDER & RESERVATION SYSTEM (Celebration Confetti)
     ========================================================================== */
  class OrderSystem {
    static triggerCelebration() {
      const banner = document.createElement('div');
      banner.className = 'order-toast-3d';
      banner.innerHTML = `
        <div class="toast-3d-card">
          <div class="toast-icon">✨</div>
          <div class="toast-body">
            <h3>Table / Order Confirmed!</h3>
            <p>Your delicious 3D gourmet meal is being prepared with love!</p>
          </div>
          <button type="button" class="toast-close">&times;</button>
        </div>
      `;
      document.body.appendChild(banner);

      setTimeout(() => banner.classList.add('show'), 50);
      banner.querySelector('.toast-close').addEventListener('click', () => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 400);
      });
      setTimeout(() => {
        if (banner.parentElement) {
          banner.classList.remove('show');
          setTimeout(() => banner.remove(), 400);
        }
      }, 5000);

      OrderSystem.launchConfetti();
    }

    static launchConfetti() {
      const colors = ['#e53935', '#fbc02d', '#43a047', '#1e88e5', '#8e24aa', '#ffb300'];
      const count = 70;
      for (let i = 0; i < count; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti-particle';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = (Math.random() * 100) + 'vw';
        conf.style.top = '-20px';
        conf.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.6 + Math.random() * 0.8})`;
        conf.style.animationDuration = (2.2 + Math.random() * 2.5) + 's';
        conf.style.animationDelay = (Math.random() * 0.5) + 's';
        document.body.appendChild(conf);

        setTimeout(() => conf.remove(), 5500);
      }
    }
  }

  /* ==========================================================================
     8. INITIALIZATION & SLIDER BRIDGE
     ========================================================================== */
  function init() {
    window.heroStage = new Hero3DStage();
    window.DishInspectorModal = new DishInspectorModal();
    init3DCardTilt();
    window.OrderSystem = OrderSystem;

    const menuCards = document.querySelectorAll('.menu-cards .card');
    menuCards.forEach((card, idx) => {
      const art = card.querySelector('.card-art');
      if (art) {
        const btn3D = document.createElement('button');
        btn3D.type = 'button';
        btn3D.className = 'card-3d-btn';
        btn3D.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <span>View in 3D</span>
        `;
        btn3D.addEventListener('click', (e) => {
          e.stopPropagation();
          window.DishInspectorModal.open(idx);
        });
        art.appendChild(btn3D);
      }
      card.addEventListener('click', () => {
        window.DishInspectorModal.open(idx);
      });
    });

    const bookButtons = document.querySelectorAll('.head-cta, button[type="button"]:not(.menu-btn):not(.tab):not(.arrow):not(.btn-3d-tool)');
    bookButtons.forEach(btn => {
      if (btn.textContent.includes('Book a Table') || btn.textContent.includes('Explore Our Menu')) {
        btn.addEventListener('click', (e) => {
          if (btn.textContent.includes('Book a Table')) {
            e.preventDefault();
            OrderSystem.triggerCelebration();
          }
        });
      }
    });

    const heroOrder = document.querySelector('.hero .order');
    if (heroOrder) {
      heroOrder.addEventListener('click', (e) => {
        e.preventDefault();
        window.DishInspectorModal.open(window.heroStage.currentDishIndex);
      });
    }

    console.log('Food Paradise 3D successfully initialized!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

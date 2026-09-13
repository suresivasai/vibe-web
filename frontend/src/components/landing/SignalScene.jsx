import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

export default function SignalScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 0.2, 7.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)
    scene.add(new THREE.AmbientLight(0xffffff, 1.2))

    const coralLight = new THREE.PointLight(0xff705f, 18, 12)
    coralLight.position.set(3, 2, 4)
    scene.add(coralLight)
    const mintLight = new THREE.PointLight(0x7ce4c5, 12, 10)
    mintLight.position.set(-3, -2, 3)
    scene.add(mintLight)

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xff705f, roughness: 0.28, metalness: 0.25 }),
      new THREE.MeshStandardMaterial({ color: 0x7ce4c5, roughness: 0.3, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: 0xf5eee7, roughness: 0.4, metalness: 0.1 }),
    ]

    const meshes = []
    for (let index = 0; index < 18; index += 1) {
      const size = 0.08 + Math.random() * 0.2
      const geometry = new THREE.IcosahedronGeometry(size, 1)
      const mesh = new THREE.Mesh(geometry, materials[index % materials.length])
      const angle = (index / 18) * Math.PI * 2
      const radius = 1.3 + Math.random() * 1.5
      mesh.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 2.8, Math.sin(angle) * radius * 0.65)
      mesh.userData = { drift: Math.random() * Math.PI * 2, baseY: mesh.position.y }
      group.add(mesh)
      meshes.push(mesh)
    }

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.018, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0xff705f, transparent: true, opacity: 0.55 })
    )
    ring.rotation.x = Math.PI / 2.7
    group.add(ring)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const entrance = gsap.fromTo(group.scale, { x: 0.72, y: 0.72, z: 0.72 }, { x: 1, y: 1, z: 1, duration: 1.4, ease: 'power3.out' })
    const ticker = () => {
      if (!reduceMotion) {
        group.rotation.y += 0.0025
        group.rotation.x = Math.sin(Date.now() * 0.00025) * 0.08
        meshes.forEach((mesh) => {
          mesh.position.y = mesh.userData.baseY + Math.sin(Date.now() * 0.0007 + mesh.userData.drift) * 0.08
        })
      }
      renderer.render(scene, camera)
    }
    gsap.ticker.add(ticker)

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      entrance.kill()
      gsap.ticker.remove(ticker)
      window.removeEventListener('resize', resize)
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          const materialList = Array.isArray(object.material) ? object.material : [object.material]
          materialList.forEach((material) => material.dispose())
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={mountRef} className="signal-scene" aria-label="Animated abstract connection visual" role="img" />
}

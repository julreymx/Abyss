/**
 * CenterRaycaster — lanza un rayo desde el centro exacto de la cámara
 * cada frame (como un FPS). Setea userData.centerHovered en los meshes
 * intersectados y despacha eventos abyss:hover para el NazarCrosshair.
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const _raycaster = new THREE.Raycaster();
const _center = new THREE.Vector2(0, 0); // centro exacto de pantalla (NDC)

export default function CenterRaycaster() {
    const { camera, scene } = useThree();
    const prevHit = useRef(null);

    useFrame(() => {
        // Rayo desde cámara hacia el centro de la pantalla
        _raycaster.setFromCamera(_center, camera);
        _raycaster.far = 120;

        // Colectar todos los meshes "apuntables"
        const targets = [];
        scene.traverse((obj) => {
            if (obj.isMesh && obj.userData.hoverable) targets.push(obj);
        });

        const hits = _raycaster.intersectObjects(targets, false);
        const hit = hits.length > 0 ? hits[0].object : null;

        // Marcar qué objeto está siendo apuntado
        targets.forEach(obj => {
            obj.userData.centerHovered = (obj === hit);
        });

        // Despachar eventos solo cuando cambia el hit
        if (hit !== prevHit.current) {
            window.dispatchEvent(new CustomEvent('abyss:hover', {
                detail: { active: !!hit }
            }));
            prevHit.current = hit;
        }
    });

    return null;
}

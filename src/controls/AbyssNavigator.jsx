import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * AbyssNavigator — First-person zero-gravity swimming navigation.
 * WASD / Arrow Keys → movement
 * Mouse drag (while pointer is locked) → look
 * Click canvas → lock pointer, ESC → release
 */
export default function AbyssNavigator({ terminalOpen = false }) {
    const { camera, gl } = useThree();
    const keys = useRef({});
    const velocity = useRef(new THREE.Vector3());
    const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
    const isLocked = useRef(false);
    const SPEED = 0.04;
    const DAMPING = 0.88;
    const LOOK_SPEED = 0.002;

    // Libera el pointer lock cuando la terminal está abierta
    useEffect(() => {
        if (terminalOpen && document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, [terminalOpen]);

    useEffect(() => {
        const canvas = gl.domElement;

        // Keyboard
        const onKeyDown = (e) => { keys.current[e.code] = true; };
        const onKeyUp = (e) => { keys.current[e.code] = false; };

        // Pointer lock
        const onMouseMove = (e) => {
            if (!isLocked.current) return;
            euler.current.y -= e.movementX * LOOK_SPEED;
            euler.current.x -= e.movementY * LOOK_SPEED;
            euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x));
        };

        const onClick = () => {
            canvas.requestPointerLock();
        };

        const onPointerLockChange = () => {
            isLocked.current = document.pointerLockElement === canvas;
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('click', onClick);
        document.addEventListener('pointerlockchange', onPointerLockChange);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('click', onClick);
            document.removeEventListener('pointerlockchange', onPointerLockChange);
        };
    }, [gl]);

    useFrame(() => {
        if (terminalOpen) return; // Pausa movimiento cuando la terminal está abierta
        // Apply euler rotation to camera
        camera.quaternion.setFromEuler(euler.current);

        // Build movement direction from keys
        const dir = new THREE.Vector3();
        const forward = new THREE.Vector3(-Math.sin(euler.current.y), 0, -Math.cos(euler.current.y));
        const right = new THREE.Vector3(Math.cos(euler.current.y), 0, -Math.sin(euler.current.y));
        const up = new THREE.Vector3(0, 1, 0);

        if (keys.current['KeyW'] || keys.current['ArrowUp']) dir.addScaledVector(forward, 1);
        if (keys.current['KeyS'] || keys.current['ArrowDown']) dir.addScaledVector(forward, -1);
        if (keys.current['KeyA'] || keys.current['ArrowLeft']) dir.addScaledVector(right, -1);
        if (keys.current['KeyD'] || keys.current['ArrowRight']) dir.addScaledVector(right, 1);
        if (keys.current['Space']) dir.addScaledVector(up, 1);   // float up
        if (keys.current['ShiftLeft']) dir.addScaledVector(up, -1);  // sink down

        if (dir.length() > 0) dir.normalize();
        velocity.current.addScaledVector(dir, SPEED);
        velocity.current.multiplyScalar(DAMPING); // inertia / damping

        camera.position.add(velocity.current);
    });

    return null;
}

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function AbyssNavigator({ terminalOpen = false }) {
    const { camera, gl } = useThree();
    const keys = useRef({});
    const velocity = useRef(new THREE.Vector3());
    const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
    const isLocked = useRef(false);
    const SPEED = 0.04;
    const DAMPING = 0.88;
    const LOOK_SPEED = 0.002;

    useEffect(() => {
        if (terminalOpen && document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, [terminalOpen]);

    useEffect(() => {
        const canvas = gl.domElement;
        const onKeyDown = (e) => { keys.current[e.code] = true; };
        const onKeyUp = (e) => { keys.current[e.code] = false; };
        const onMouseMove = (e) => {
            if (!isLocked.current) return;
            euler.current.y -= e.movementX * LOOK_SPEED;
            euler.current.x -= e.movementY * LOOK_SPEED;
            euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x));
        };
        const onClick = () => { if (!terminalOpen) canvas.requestPointerLock(); };
        const onLockChange = () => { isLocked.current = document.pointerLockElement === canvas; };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('click', onClick);
        document.addEventListener('pointerlockchange', onLockChange);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('click', onClick);
            document.removeEventListener('pointerlockchange', onLockChange);
        };
    }, [gl, terminalOpen]);

    useFrame(() => {
        if (terminalOpen) return;
        camera.quaternion.setFromEuler(euler.current);
        const dir = new THREE.Vector3();
        const fwd = new THREE.Vector3(-Math.sin(euler.current.y), 0, -Math.cos(euler.current.y));
        const right = new THREE.Vector3(Math.cos(euler.current.y), 0, -Math.sin(euler.current.y));
        if (keys.current['KeyW'] || keys.current['ArrowUp']) dir.addScaledVector(fwd, 1);
        if (keys.current['KeyS'] || keys.current['ArrowDown']) dir.addScaledVector(fwd, -1);
        if (keys.current['KeyA'] || keys.current['ArrowLeft']) dir.addScaledVector(right, -1);
        if (keys.current['KeyD'] || keys.current['ArrowRight']) dir.addScaledVector(right, 1);
        if (keys.current['Space']) dir.y += 1;
        if (keys.current['ShiftLeft']) dir.y -= 1;
        if (dir.length() > 0) dir.normalize();
        velocity.current.addScaledVector(dir, SPEED);
        velocity.current.multiplyScalar(DAMPING);
        camera.position.add(velocity.current);
    });

    return null;
}

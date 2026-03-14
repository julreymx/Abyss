import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function AbyssNavigator({ terminalOpen = false }) {
    const { camera, gl } = useThree();
    const keys         = useRef({});
    const velocity     = useRef(new THREE.Vector3());
    const euler        = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
    const isLocked     = useRef(false);
    const justUnlocked = useRef(false);

    // ── Fly-to state ──────────────────────────────────────────────────────────
    const flyTarget   = useRef(null);       // THREE.Vector3 | null
    const isFlyingRef = useRef(false);
    const flyLookDir  = useRef(new THREE.Vector3());

    const SPEED      = 0.04;
    const DAMPING    = 0.88;
    const LOOK_SPEED = 0.002;

    useEffect(() => {
        if (terminalOpen && document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, [terminalOpen]);

    useEffect(() => {
        const canvas = gl.domElement;

        const onKeyDown   = (e) => { keys.current[e.code] = true; };
        const onKeyUp     = (e) => { keys.current[e.code] = false; };

        const onMouseMove = (e) => {
            if (!isLocked.current || isFlyingRef.current) return;
            euler.current.y -= e.movementX * LOOK_SPEED;
            euler.current.x -= e.movementY * LOOK_SPEED;
            euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x));
        };

        const onClick = (e) => {
            if (terminalOpen) return;
            if (e.button === 0) {
                if (justUnlocked.current) { justUnlocked.current = false; return; }
                canvas.requestPointerLock();
            }
        };

        const onGlobalMouseDown = (e) => {
            if (e.button === 2 && document.pointerLockElement) {
                document.exitPointerLock();
            }
        };

        const onContextMenu = (e) => e.preventDefault();

        const onLockChange = () => {
            const locked = document.pointerLockElement === canvas;
            if (isLocked.current && !locked) {
                justUnlocked.current = true;
                setTimeout(() => { justUnlocked.current = false; }, 800);
            }
            isLocked.current = locked;
            window.dispatchEvent(new CustomEvent('abyss:lockchange', { detail: { locked } }));
        };

        // ── Fly-to listener ────────────────────────────────────────────────
        const onFlyTo = (e) => {
            const [x, y, z] = e.detail.position;
            // Land 6 units in front of target so the text stays readable
            const target = new THREE.Vector3(x, y, z);
            const dir    = new THREE.Vector3().subVectors(target, camera.position).normalize();
            flyTarget.current   = new THREE.Vector3().copy(target).addScaledVector(dir, -6);
            flyLookDir.current  = dir.clone();
            velocity.current.set(0, 0, 0);
            isFlyingRef.current = true;

            // Release pointer lock so the user can interact with the navigator
            if (document.pointerLockElement) document.exitPointerLock();
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup',   onKeyUp);
        window.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onClick);
        document.addEventListener('mousedown',        onGlobalMouseDown, true);
        document.addEventListener('contextmenu',      onContextMenu);
        document.addEventListener('pointerlockchange', onLockChange);
        window.addEventListener('abyss:flyto',        onFlyTo);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup',   onKeyUp);
            window.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mousedown', onClick);
            document.removeEventListener('mousedown',        onGlobalMouseDown, true);
            document.removeEventListener('contextmenu',      onContextMenu);
            document.removeEventListener('pointerlockchange', onLockChange);
            window.removeEventListener('abyss:flyto',        onFlyTo);
        };
    }, [gl, terminalOpen, camera]);

    useFrame((_, delta) => {
        if (terminalOpen) return;

        // ── Fly-to animation ────────────────────────────────────────────────
        if (isFlyingRef.current && flyTarget.current) {
            const t = Math.min(4.5 * delta, 1);   // lerp factor (~1.5s travel)
            camera.position.lerp(flyTarget.current, t);

            // Smoothly rotate toward the target
            const lookTarget = new THREE.Vector3().addVectors(camera.position, flyLookDir.current);
            const _m = new THREE.Matrix4().lookAt(camera.position, lookTarget, camera.up);
            const _q = new THREE.Quaternion().setFromRotationMatrix(_m);
            camera.quaternion.slerp(_q, t * 2);

            // Arrived?
            if (camera.position.distanceTo(flyTarget.current) < 0.5) {
                isFlyingRef.current = false;
                flyTarget.current   = null;
                // Sync euler so WASD resumes from correct orientation
                euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
            }
            return;
        }

        // ── Normal navigation ────────────────────────────────────────────────
        camera.quaternion.setFromEuler(euler.current);
        const dir   = new THREE.Vector3();
        const fwd   = new THREE.Vector3(-Math.sin(euler.current.y), 0, -Math.cos(euler.current.y));
        const right = new THREE.Vector3(Math.cos(euler.current.y), 0, -Math.sin(euler.current.y));
        if (keys.current['KeyW']    || keys.current['ArrowUp'])    dir.addScaledVector(fwd, 1);
        if (keys.current['KeyS']    || keys.current['ArrowDown'])  dir.addScaledVector(fwd, -1);
        if (keys.current['KeyA']    || keys.current['ArrowLeft'])  dir.addScaledVector(right, -1);
        if (keys.current['KeyD']    || keys.current['ArrowRight']) dir.addScaledVector(right, 1);
        if (keys.current['Space'])      dir.y += 1;
        if (keys.current['ShiftLeft'])  dir.y -= 1;
        if (dir.length() > 0) dir.normalize();
        velocity.current.addScaledVector(dir, SPEED);
        velocity.current.multiplyScalar(DAMPING);
        camera.position.add(velocity.current);
    });

    return null;
}

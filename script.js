function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
        }

        const experienceRolloverTimeZone = 'America/Los_Angeles';

        function getRolloverDateParts(date = new Date()) {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: experienceRolloverTimeZone,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });

            const parts = formatter.formatToParts(date).reduce((accumulator, part) => {
                if (part.type !== 'literal') {
                    accumulator[part.type] = Number(part.value);
                }

                return accumulator;
            }, {});

            return {
                year: parts.year,
                month: parts.month,
                day: parts.day
            };
        }

        function syncRollingYearCounts(date = new Date()) {
            const { year, month, day } = getRolloverDateParts(date);
            const rolloverOffset = month === 12 && day === 31 ? 1 : 0;

            document.querySelectorAll('.rolling-year-count').forEach((element) => {
                const baseValue = Number(element.dataset.baseValue);
                const baseYear = Number(element.dataset.baseYear);

                if (!Number.isFinite(baseValue) || !Number.isFinite(baseYear)) {
                    return;
                }

                const yearsToAdd = Math.max(0, year - baseYear + rolloverOffset);
                element.textContent = `${baseValue + yearsToAdd}+`;
            });
        }

        function focusProjectsTimelineOnRecentWork() {
            const timelineScroll = document.querySelector('.projects-timeline-scroll');

            if (!timelineScroll) {
                return;
            }

            const maxScrollLeft = Math.max(0, timelineScroll.scrollWidth - timelineScroll.clientWidth);
            timelineScroll.scrollLeft = maxScrollLeft;
        }
        
        let lastScrollTop = 0;
        const header = document.querySelector('header');

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            if (scrollTop > lastScrollTop && scrollTop > 50) {
                // Scrolling down
                header.classList.add('shrink');
            } else {
                // Scrolling up or near top
                header.classList.remove('shrink');
            }

            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        });

        function copyEmail() {
            const email = "SkylarKelley@gmail.com";
            navigator.clipboard.writeText(email).then(() => {
                const confirm = document.getElementById("copy-confirm");
                confirm.classList.add("visible");
                setTimeout(() => {
                    confirm.classList.remove("visible");
                }, 1500);
            }).catch(err => {
                console.error("Failed to copy email:", err);
            });
        }

        function openVideoModal(url) {
            const modal = document.getElementById('videoModal');
            const frame = document.getElementById('videoFrame');
            frame.src = url + "?autoplay=1";
            modal.classList.add('active');
        }

        function closeVideoModal() {
            const modal = document.getElementById('videoModal');
            const frame = document.getElementById('videoFrame');
            frame.src = "";
            modal.classList.remove('active');
        }

        const reticle = document.querySelector('.reticle');
        let mouseX = 0;
        let mouseY = 0;
        let offset = 16;
        const baseOffset = parseFloat(getComputedStyle(reticle).getPropertyValue('--base-offset')) || 10;
        const maxOffset = 128;
        const growthStep = 1;
        const growthRate = 65;
        const pauseDuration = 200;
        const maxRotation = 10; // ⬅️ Limit for rotation in degrees

        let holdInterval = null;
        let shrinkPauseUntil = 0;
        let currentRotation = 0;

        let recoilX = 0;
        let recoilY = 0;

        // Track mouse position
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Apply reticle transform: position + rotation
        function updateReticleTransform() {
            const finalX = mouseX + recoilX;
            const finalY = mouseY + recoilY;
            reticle.style.top = `${finalY}px`;
            reticle.style.left = `${finalX}px`;
            reticle.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
            requestAnimationFrame(updateReticleTransform);
        }

    // Fire one "shot" of reticle – grow if possible, always pop
        function fireReticleShot() {
            if (offset < maxOffset) {
                offset = Math.min(offset + growthStep, maxOffset);
                reticle.style.setProperty('--offset', `${offset}px`);
            }

            // Always apply a small rotational "pop"
            const rotationBurst = (Math.random() - 0.5) * 10; // ±5 degrees
            currentRotation += rotationBurst;
            currentRotation = Math.max(-maxRotation, Math.min(maxRotation, currentRotation));

            // Leave a shot mark on the page
            spawnShotMark(mouseX + recoilX, mouseY + recoilY);

            // ➕ Add subtle recoil movement (reticle crawl)
            const recoilStep = 1.25;
            recoilX += (Math.random() - 0.5) * recoilStep;
            recoilY += -Math.abs(Math.random()) * recoilStep; // bias upward

            // Pause shrinking
            shrinkPauseUntil = Date.now() + pauseDuration;
        }

        // Mouse down initiates shots
        document.addEventListener('mousedown', () => {
            if (!reticleEnabled) return;

            clearInterval(holdInterval);
            fireReticleShot();
            spawnInteractX();

            holdInterval = setInterval(() => {
                fireReticleShot();
            }, growthRate);
        });

        document.addEventListener('mouseup', () => {
            clearInterval(holdInterval);
        });

        // Smoothly shrink and rotate back to center
        function smoothShrink() {
            const now = Date.now();

            if (now >= shrinkPauseUntil) {
                // Shrink offset
                if (offset > baseOffset) {
                    offset -= (offset - baseOffset) * 0.1;
                    if (Math.abs(offset - baseOffset) < 0.5) {
                        offset = baseOffset;
                    }
                    reticle.style.setProperty('--offset', `${offset}px`);
                }

                // Smoothly decay rotation to 0
                if (Math.abs(currentRotation) > 0.1) {
                    currentRotation -= currentRotation * 0.1;
                } else {
                    currentRotation = 0;
                }

                // Ease recoil back toward center
                recoilX -= recoilX * 0.1;
                recoilY -= recoilY * 0.1;
            }

            requestAnimationFrame(smoothShrink);
        }

        // Start animation loops
        updateReticleTransform();
        smoothShrink();
        // Reticle is disabled by default
        reticle.style.display = 'none';
        document.body.classList.remove('reticle-on');

        function spawnShotMark(x, y) {
            const mark = document.createElement('div');
            mark.classList.add('shot-mark');

            // 🎯 Authorable bias center within reticle spread (percent inside radius circle)
            const biasXPercent = 0.5;  // 0 = far left, 1 = far right
            const biasYPercent = 0.65;  // 0 = top, 1 = bottom

            const spreadRadius = offset;

            // Convert bias % to offset from center
            const biasX = (biasXPercent - 0.5) * 2 * spreadRadius;
            const biasY = (biasYPercent - 0.5) * 2 * spreadRadius;

            // Gaussian bias for central clustering
            function gaussianRandom(mean = 0, stddev = 1) {
                let u = 1 - Math.random();
                let v = Math.random();
                return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stddev + mean;
            }

            // Combine Gaussian + Uniform noise
            const gaussianWeight = 0.6; // 🎯 how dominant the bell curve is (0 = uniform only, 1 = gaussian only)
            const uniformWeight = 1 - gaussianWeight;

            const dx = gaussianRandom(biasX, spreadRadius * 0.25) * gaussianWeight
                + (Math.random() * 2 - 1) * spreadRadius * uniformWeight;
            const dy = gaussianRandom(biasY, spreadRadius * 0.25) * gaussianWeight
                + (Math.random() * 2 - 1) * spreadRadius * uniformWeight;

            // Final screen-space shot location
            const finalX = x + dx;
            const finalY = y + dy;

            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const absoluteX = finalX + scrollLeft;
            const absoluteY = finalY + scrollTop;

            mark.style.position = 'absolute';
            mark.style.left = `${absoluteX}px`;
            mark.style.top = `${absoluteY}px`;

            // 🔹 Style
            mark.style.clipPath = generateJaggedClipPath();
            const scale = 0.15 + Math.random() * 0.1;
            const rotation = Math.random() * 360;
            mark.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;

            setTimeout(() => {
                mark.style.opacity = '0';
            }, 10);

            setTimeout(() => {
                mark.remove();
            }, 10000);

            document.body.appendChild(mark);
        }

        function generateJaggedClipPath(points = 20, radiusMin = 12, radiusMax = 24) {
            const centerX = 50;
            const centerY = 50;
            const angleStep = (Math.PI * 2) / points;

            const polygonPoints = [];

            for (let i = 0; i < points; i++) {
                const angle = i * angleStep;
                const radius = radiusMin + Math.random() * (radiusMax - radiusMin);

                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);

                polygonPoints.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
            }

            return `polygon(${polygonPoints.join(', ')})`;
        }

        function toggleSecret(button) {
            const password = prompt("Enter password to view this section:");
            const correct = "CombatConfidential";

            if (password === correct) {
                const section = button.closest('.confidential-section');
                const content = section.querySelector('#confidential-content');
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            } else if (password !== null) {
                alert("Incorrect password.");
            }
        }


        function spawnInteractX() {
            const xMark = document.createElement('div');
            xMark.classList.add('interact-x');

            const arms = ['tl', 'tr', 'br', 'bl'];
            arms.forEach(arm => {
                const line = document.createElement('div');
                line.classList.add('interact-x-line', arm);
                xMark.appendChild(line);
            });

            document.querySelector('.reticle').appendChild(xMark);

            // Fade and remove
            setTimeout(() => xMark.style.opacity = '0', 60);
            setTimeout(() => xMark.remove(), 400);
        }

        document.addEventListener('click', (e) => {
            const target = e.target;
            const isInteractive =
                target.closest('button, a, input, select, textarea, [role="button"], [onclick], .handle');

            if (isInteractive) {
                spawnInteractX();
            }
        });

        let reticleEnabled = false;

        function toggleReticle() {
            reticleEnabled = !reticleEnabled;
            const reticle = document.querySelector('.reticle');
            const icon = document.querySelector('.reticle-icon');

            if (reticleEnabled) {
                // Enable reticle, hide system cursor
                reticle.style.display = 'block';
                document.body.classList.add('reticle-on');
                icon.textContent = '🖱️'; // shows mouse icon when reticle is active
            } else {
                // Disable reticle, show system cursor
                reticle.style.display = 'none';
                document.body.classList.remove('reticle-on');
                icon.textContent = '🎯'; // shows target icon when reticle is inactive
            }
        }

        const projectRows = document.querySelectorAll('.projects-row');
        const projectDetails = document.querySelectorAll('.project-details');

        projectRows.forEach((row, index) => {
            const details = projectDetails[index];
            const toggleButton = row.querySelector('.dropdown-toggle');

            if (!details || !toggleButton) {
                return;
            }

            if (!details.id) {
                details.id = `project-details-${index + 1}`;
            }

            function syncProjectToggleState() {
                const isOpen = row.classList.contains('active');
                toggleButton.textContent = isOpen ? 'Less Info ^' : 'More Info v';
                toggleButton.setAttribute('aria-expanded', String(isOpen));
                toggleButton.setAttribute('aria-controls', details.id);
            }

            syncProjectToggleState();

            toggleButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                row.classList.toggle('active');
                syncProjectToggleState();
            });
        });


        // Automatically wrap video thumbnails and add overlay
        document.querySelectorAll('.video-thumbnail').forEach(img => {
            // Only wrap if not already wrapped
            if (!img.closest('.video-thumbnail-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'video-thumbnail-wrapper';

                const overlay = document.createElement('div');
                overlay.className = 'play-button-overlay';
                overlay.textContent = '▶';

                // Insert wrapper before image and move image inside
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
                wrapper.appendChild(overlay);
            }
        });

        let currentImageIndex = 0;
        let currentImageElements = [];
        const supportsHoverPreview = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const projectLightboxSelector = '.project-details img.project-preview, .project-details img.project-inline-image';

        function isVisibleElement(element) {
            return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
        }

        function getLightboxGroup(trigger) {
            const projectContainer = trigger.closest('.project-details');
            if (projectContainer) {
                return Array.from(projectContainer.querySelectorAll(projectLightboxSelector)).filter(isVisibleElement);
            }

            const groupName = trigger.dataset.lightboxGroup || 'gallery';
            return Array.from(document.querySelectorAll(`.lightbox-trigger[data-lightbox-group="${groupName}"]`)).filter(isVisibleElement);
        }

        function setLightboxImage(index) {
            if (!currentImageElements.length) {
                return;
            }

            const lightboxImg = document.getElementById("enhanced-lightbox-img");
            const activeImage = currentImageElements[index];
            lightboxImg.src = activeImage.src;
            lightboxImg.alt = activeImage.alt || "Preview";
        }

        function openEnhancedLightboxFromTrigger(trigger, options = {}) {
            currentImageElements = getLightboxGroup(trigger);
            currentImageIndex = Math.max(0, currentImageElements.indexOf(trigger));

            const lightbox = document.getElementById("enhanced-lightbox");
            lightbox.classList.toggle("hover-preview-mode", !!options.hoverPreview);

            setLightboxImage(currentImageIndex);
            lightbox.classList.add("show");
        }

        function closeEnhancedLightbox() {
            const lightbox = document.getElementById("enhanced-lightbox");
            lightbox.classList.remove("show", "hover-preview-mode");
        }

        function closeHoverPreview() {
            const lightbox = document.getElementById("enhanced-lightbox");
            if (lightbox.classList.contains("hover-preview-mode")) {
                lightbox.classList.remove("show", "hover-preview-mode");
            }
        }

        function showPrevImage() {
            if (!currentImageElements.length) {
                return;
            }

            currentImageIndex = (currentImageIndex - 1 + currentImageElements.length) % currentImageElements.length;
            setLightboxImage(currentImageIndex);
        }

        function showNextImage() {
            if (!currentImageElements.length) {
                return;
            }

            currentImageIndex = (currentImageIndex + 1) % currentImageElements.length;
            setLightboxImage(currentImageIndex);
        }

        document.addEventListener("keydown", (e) => {
            const lightbox = document.getElementById("enhanced-lightbox");
            const isOpen = lightbox.classList.contains("show");
            const isHoverPreview = lightbox.classList.contains("hover-preview-mode");

            if (!isOpen || isHoverPreview) return;
            if (e.key === "Escape") closeEnhancedLightbox();
            if (e.key === "ArrowLeft") showPrevImage();
            if (e.key === "ArrowRight") showNextImage();
        });

        document.addEventListener("DOMContentLoaded", () => {
            syncRollingYearCounts();
            requestAnimationFrame(focusProjectsTimelineOnRecentWork);

            document.querySelectorAll('.lightbox-trigger').forEach((img) => {
                if (!img.dataset.lightboxGroup) {
                    const collectionGroup = img.closest('[data-lightbox-group]');
                    img.dataset.lightboxGroup = collectionGroup ? collectionGroup.dataset.lightboxGroup : 'gallery';
                }

                img.loading = 'lazy';
                img.decoding = 'async';
                img.tabIndex = 0;
                img.setAttribute('role', 'button');
                img.setAttribute('aria-label', `Open full-size preview for ${img.alt || 'gallery image'}`);

                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEnhancedLightboxFromTrigger(img);
                });

                img.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEnhancedLightboxFromTrigger(img);
                    }
                });

                if (supportsHoverPreview) {
                    img.addEventListener('mouseenter', () => {
                        openEnhancedLightboxFromTrigger(img, { hoverPreview: true });
                    });

                    img.addEventListener('mouseleave', () => {
                        closeHoverPreview();
                    });
                }
            });

            document.querySelectorAll(projectLightboxSelector).forEach((img) => {
                img.classList.add('project-lightbox-trigger');
                img.tabIndex = 0;
                img.setAttribute('role', 'button');
                img.setAttribute('aria-label', `Open full-size preview for ${img.alt || 'project image'}`);

                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEnhancedLightboxFromTrigger(img);
                });

                img.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEnhancedLightboxFromTrigger(img);
                    }
                });

                if (supportsHoverPreview) {
                    img.addEventListener('mouseenter', () => {
                        openEnhancedLightboxFromTrigger(img, { hoverPreview: true });
                    });

                    img.addEventListener('mouseleave', () => {
                        closeHoverPreview();
                    });
                }
            });
        });

        window.addEventListener('load', focusProjectsTimelineOnRecentWork);

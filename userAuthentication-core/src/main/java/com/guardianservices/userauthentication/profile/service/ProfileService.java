package com.guardianservices.userauthentication.profile.service;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.common.exception.ForbiddenException;
import com.guardianservices.userauthentication.common.exception.NotFoundException;
import com.guardianservices.userauthentication.common.exception.ValidationException;
import com.guardianservices.userauthentication.objectstorage.ObjectStatus;
import com.guardianservices.userauthentication.objectstorage.StoredObject;
import com.guardianservices.userauthentication.objectstorage.repository.StoredObjectRepository;
import com.guardianservices.userauthentication.profile.UserProfile;
import com.guardianservices.userauthentication.profile.repository.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserProfileRepository profileRepository;
    private final StoredObjectRepository objectRepository;

    @Transactional(readOnly = true)
    public UserProfile getProfile(User user) {
        return profileRepository.findById(user.getId())
            .orElseGet(() -> createDefaultProfile(user));
    }

    @Transactional
    public UserProfile updateProfile(User user, String displayName, String locale, String timezone) {
        UserProfile profile = profileRepository.findById(user.getId())
            .orElseGet(() -> createDefaultProfile(user));

        if (displayName != null) {
            if (displayName.length() > 100) {
                throw new ValidationException("Display name too long", Map.of("displayName", "Max 100 characters"));
            }
            profile.setDisplayName(displayName);
        }

        if (locale != null) {
            profile.setLocale(locale);
        }

        if (timezone != null) {
            profile.setTimezone(timezone);
        }

        UserProfile updatedProfile = profileRepository.save(profile);
        log.info("Profile updated for user {}", user.getId());
        return updatedProfile;
    }

    @Transactional
    public UserProfile updateAvatar(User user, UUID objectId) {
        UserProfile profile = profileRepository.findById(user.getId())
            .orElseGet(() -> createDefaultProfile(user));

        // Validate object belongs to user and is READY
        StoredObject object = objectRepository.findById(objectId)
            .orElseThrow(() -> new NotFoundException("Object not found"));

        if (!object.getOwnerUser().getId().equals(user.getId())) {
            throw new ForbiddenException("Object not owned by user");
        }

        if (object.getStatus() != ObjectStatus.READY) {
            throw new ValidationException("Object not ready", Map.of("object", "Not processed"));
        }

        profile.setAvatarObjectId(objectId);
        UserProfile updatedProfile = profileRepository.save(profile);
        log.info("Avatar {} assigned to user {}", objectId, user.getId());
        return updatedProfile;
    }

    @Transactional
    public void deleteAvatar(User user) {
        UserProfile profile = profileRepository.findById(user.getId())
            .orElseGet(() -> createDefaultProfile(user));

        profile.setAvatarObjectId(null);
        profileRepository.save(profile);
        log.info("Avatar removed for user {}", user.getId());
    }

    private UserProfile createDefaultProfile(User user) {
        UserProfile profile = new UserProfile();
        profile.setUserId(user.getId());
        profile.setUser(user);
        return profileRepository.save(profile);
    }
}
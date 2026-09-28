const repository = require('../../database/repository');
const { hashPassword, verifyPassword } = require('../../shared/security');
const { errors } = require('../../shared/errors');

async function updateProfile(userId, payload) {
    const patch = {
        nickname: payload.nickname,
        phone: payload.phone
    };
    Object.keys(patch).forEach(key => patch[key] === undefined && delete patch[key]);
    if (!Object.keys(patch).length) return repository.findUserById(userId);
    return repository.updateUserProfile(userId, patch);
}

async function changePassword(userId, oldPassword, newPassword) {
    const user = await repository.findUserById(userId);
    const fullUser = user ? await repository.findUserByUsername(user.username) : null;
    if (!fullUser || !verifyPassword(fullUser.password_hash, oldPassword)) {
        throw errors.unauthorized('原密码错误');
    }
    if (oldPassword === newPassword) {
        throw errors.conflict('新密码不能与原密码相同');
    }

    await repository.updatePassword(userId, hashPassword(newPassword));
    await repository.revokeAllUserSessions(userId);
    return { changed: true };
}

async function listAddresses(userId) {
    return repository.listAddresses(userId);
}

async function createAddress(userId, payload) {
    return repository.createAddress(userId, payload);
}

async function updateAddress(userId, addressId, payload) {
    const address = await repository.updateAddress(userId, addressId, payload);
    if (!address) throw errors.notFound('收货地址不存在');
    return address;
}

async function setDefaultAddress(userId, addressId) {
    const address = await repository.setDefaultAddress(userId, addressId);
    if (!address) throw errors.notFound('收货地址不存在');
    return address;
}

async function deleteAddress(userId, addressId) {
    const address = await repository.deleteAddress(userId, addressId);
    if (!address) throw errors.notFound('收货地址不存在');
    return { deleted: true };
}

module.exports = {
    updateProfile,
    changePassword,
    listAddresses,
    createAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress
};

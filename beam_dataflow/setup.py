import setuptools

PACKAGE_NAME = 'hashtagsbattle'
PACKAGE_VERSION = '0.0.1'
REQUIRED_PACKAGES = []

setuptools.setup(
        name=PACKAGE_NAME,
        version=PACKAGE_VERSION,
        description='Tweeter hashtags streaming analytics!',
        install_requires=REQUIRED_PACKAGES,
        packages=setuptools.find_packages()
)

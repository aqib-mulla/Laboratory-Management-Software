import CreateProfile from "../models/CreateProfile.js";

const createProfile = async (req, res) => {
    try {
        // console.log(req.body);
        const {
           profileName,
            profilePrice,
            testFields,
        } = req.body;

        const profileTest = new CreateProfile({
            profileName,
            profilePrice,
            testFields,
        });

        const createdProfile = await profileTest.save();

        res.status(201).json(createdProfile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getProfiles = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
        const profiles = await CreateProfile.find();
        // console.log('Fetched profiles:', profiles);
        res.json(profiles);
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
}

export const findProfilebyId = async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
      const profileId = req.params.id; // Get the patient id from the route parameter
      const profile = await CreateProfile.findById(profileId); // Use findById to fetch a patient by id
    //   console.log('Fetched Profile:', profile);

      if (!profile) {
          return res.status(404).json({ error: 'Profile not found' });
      }

      res.json(profile);
  } catch (error) {
      console.error('Error fetching test:', error);
      res.status(500).json({ error: 'Failed to fetch Profile' });
  }

}

export const updateProfileTestById = async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const { updatedGroupTest, selectedTestsData } = req.body;
  
  try {

      const profileId = req.params.id; // Get the patient id from the route parameter

      // Find the original group test
      const originalGroup = await CreateProfile.findById(profileId);

      if (!originalGroup) {
          return res.status(404).json({ error: "Group not found" });
      }

      // Identify added and deleted tests
      const addedTests = selectedTestsData.filter(selectedTest => {
          return !originalGroup.testFields.some(originalTest => originalTest.testId === selectedTest.testId);
      });

      const deletedTests = originalGroup.testFields.filter(originalTest => {
          return !selectedTestsData.some(selectedTest => selectedTest.testId === originalTest.testId);
      });

      // Combine the updated testFields array with existing details
      const updatedTestFields = [
          ...originalGroup.testFields.filter(test => !deletedTests.includes(test)),
          ...addedTests,
          ...updatedGroupTest.testFields
      ];

      // Update the group test details
      // originalGroup.groupCategory = updatedGroupTest.groupCategory;
      originalGroup.profileName = updatedGroupTest.profileName;
      originalGroup.profilePrice = updatedGroupTest.profilePrice;
      originalGroup.testFields = updatedTestFields;

      // Save the updated group test
      const updatedGroup = await originalGroup.save();

      res.status(200).json(updatedGroup);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }

}

export const deleteProfile = async (req, res) => {

    const profileId  = req.params.id;
  
    try {
      const deletedProfile = await CreateProfile.findByIdAndDelete(profileId);
  
      if (!deletedProfile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
  
      res.json({ message: 'Profile deleted successfully' });
    } catch (error) {
      console.error('Error deleting Profile:', error);
      res.status(500).json({ error: 'An error occurred while deleting the Profile' });
    }
  }


export default createProfile